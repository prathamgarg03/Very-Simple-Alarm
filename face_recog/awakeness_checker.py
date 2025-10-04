"""
Awakeness Checker Module

This module provides a strict boolean awakeness checker that combines MTCNN face detection
with eye awareness analysis. It's designed for safety-critical applications where it's
better to keep an alarm on than to dismiss it incorrectly.
"""

import cv2
import numpy as np
from typing import Union, Optional
import time

try:
    from mtcnn_face_detector import MTCNNFaceDetector
    from eye_awareness_analyzer import EyeAwakenessAnalyzer
    from calibrate_threshold import load_calibrated_threshold
except ImportError as e:
    # Handle case where calibrate_threshold is not available
    def load_calibrated_threshold():
        return 90
    
    try:
        from mtcnn_face_detector import MTCNNFaceDetector
        from eye_awareness_analyzer import EyeAwakenessAnalyzer
    except ImportError as e:
        raise ImportError(
            f"Required modules not found: {e}. "
            "Make sure mtcnn_face_detector.py and eye_awareness_analyzer.py are available."
        )


class AwakenessChecker:
    """
    A strict awakeness checker that combines face detection with eye analysis.
    
    This class is designed for safety-critical applications where false positives
    (incorrectly saying someone is awake when they're not) are dangerous. It uses
    consecutive frame validation and strict criteria:
    - Requires exactly one face detected
    - Requires BOTH eyes to be open
    - Requires consecutive frames of "awake" state for confirmation
    - Returns False on ANY error or ambiguous state
    """

    def __init__(self, brightness_threshold: float = None, 
                 consecutive_frames_required: int = 3):
        """
        Initialize the awakeness checker.
        
        Args:
            brightness_threshold (float, optional): Brightness threshold for eye open detection.
                                                  If None, will try to load calibrated value,
                                                  otherwise uses default 90.0.
            consecutive_frames_required (int): Number of consecutive "awake" detections
                                             required before returning True. This prevents
                                             false positives from momentary eye opening
                                             or detection artifacts. Default is 3 frames.
        
        Raises:
            ValueError: If parameters are invalid
            RuntimeError: If detector initialization fails
        """
        # Load calibrated threshold if not provided
        if brightness_threshold is None:
            brightness_threshold = load_calibrated_threshold()
            print(f"Using {'calibrated' if brightness_threshold != 90 else 'default'} brightness threshold: {brightness_threshold}")
        
        # Validate parameters
        if not 0 <= brightness_threshold <= 255:
            raise ValueError(f"Brightness threshold must be 0-255, got {brightness_threshold}")
        
        if consecutive_frames_required < 1:
            raise ValueError(f"Consecutive frames required must be >= 1, got {consecutive_frames_required}")
        
        # Initialize detectors
        try:
            self.face_detector = MTCNNFaceDetector()
            self.eye_analyzer = EyeAwakenessAnalyzer(
                brightness_threshold=brightness_threshold,
                eye_region_size=(30, 20)
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize detectors: {str(e)}")
        
        # State tracking for consecutive frame validation
        self.consecutive_frames_required = consecutive_frames_required
        self.consecutive_awake_count = 0
        self.brightness_threshold = brightness_threshold
        
        # Performance tracking (optional, for debugging)
        self._last_detection_time = 0.0
        self._frame_count = 0

    def is_awake(self, image: Union[str, np.ndarray]) -> bool:
        """
        Determine if the person in the image is awake (both eyes open).
        
        This is the main method that performs the complete awakeness check.
        It follows a strict protocol:
        1. Detect face using MTCNN - must find exactly one face
        2. Extract eye positions from facial keypoints
        3. Analyze both eye regions for openness
        4. Return True ONLY if both eyes are definitively open
        5. Return False for any error, ambiguity, or closed eyes
        
        Args:
            image: Image file path (str) or numpy array containing a face
            
        Returns:
            bool: True if person is definitely awake (both eyes open),
                  False otherwise (including all error cases)
                  
        Note:
            This method is designed to be conservative. It will return False
            in ambiguous cases to prevent false positives in safety applications.
        """
        try:
            # Step 1: Detect face using MTCNN
            face_result = self.face_detector.detect_face(image)
            
            # Must have exactly one face detected successfully
            if not face_result.get('success', False):
                return False
            
            # Step 2: Load image for eye analysis if we have a file path
            if isinstance(image, str):
                img_array = cv2.imread(image)
                if img_array is None:
                    return False
                img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
            else:
                img_array = image
                
            # Validate image array
            if img_array is None or img_array.size == 0:
                return False
            
            # Step 3: Extract eye positions from keypoints
            keypoints = face_result.get('keypoints')
            if not keypoints:
                return False
            
            try:
                left_eye_pos = tuple(keypoints['left_eye'])
                right_eye_pos = tuple(keypoints['right_eye'])
            except (KeyError, TypeError, ValueError):
                return False
            
            # Step 4: Analyze both eye regions
            eye_result = self.eye_analyzer.analyze_both_eyes(
                img_array, left_eye_pos, right_eye_pos
            )
            
            # Must have successful analysis
            if not eye_result.get('analysis_successful', False):
                return False
            
            # Step 5: Return True ONLY if both eyes are open
            left_eye_open = eye_result.get('left_eye', {}).get('is_open', False)
            right_eye_open = eye_result.get('right_eye', {}).get('is_open', False)
            
            # Both eyes must be open
            return left_eye_open and right_eye_open
            
        except Exception:
            # Any exception means we can't reliably determine awakeness
            # In safety applications, we err on the side of caution
            return False

    def check_video_stream(self, camera_index: int = 0) -> bool:
        """
        Continuously monitor video stream for awakeness with consecutive frame validation.
        
        Opens the specified camera and processes frames in real-time. Displays
        the video feed with overlay text showing the current state. Returns True
        only after detecting the person as awake for the required number of
        consecutive frames.
        
        Args:
            camera_index (int): Camera device index (0 for default camera)
            
        Returns:
            bool: True if person verified awake for consecutive frames,
                  False if user quits or camera fails
                  
        Controls:
            - Press 'q' or 'Q' to quit and return False
            - ESC key also quits
            
        Display:
            - "AWAKE ✓" in green when both eyes detected open
            - "SLEEPY ✗" in red when not awake
            - Frame counter showing consecutive awake frames
            - Face detection confidence when available
        """
        # Reset consecutive count at start
        self.consecutive_awake_count = 0
        
        # Open video capture
        try:
            cap = cv2.VideoCapture(camera_index)
            if not cap.isOpened():
                print(f"Error: Could not open camera {camera_index}")
                return False
                
            # Set camera properties for better performance
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            
        except Exception as e:
            print(f"Error initializing camera: {e}")
            return False
        
        print(f"Awakeness monitoring started. Press 'Q' to quit.")
        print(f"Consecutive frames required: {self.consecutive_frames_required}")
        
        frame_number = 0
        
        try:
            while True:
                # Capture frame
                ret, frame = cap.read()
                if not ret:
                    print("Error: Could not read frame from camera")
                    break
                
                frame_number += 1
                
                # Convert BGR to RGB for analysis
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # Check awakeness
                is_currently_awake = self.is_awake(frame_rgb)
                
                # Update consecutive counter
                if is_currently_awake:
                    self.consecutive_awake_count += 1
                else:
                    self.consecutive_awake_count = 0
                
                # Determine display status
                if is_currently_awake:
                    status_text = "AWAKE ✓"
                    status_color = (0, 255, 0)  # Green
                else:
                    status_text = "SLEEPY ✗"
                    status_color = (0, 0, 255)  # Red
                
                # Add text overlay to frame
                cv2.putText(frame, status_text, (20, 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1.5, status_color, 3)
                
                # Add consecutive frame counter
                counter_text = f"Consecutive: {self.consecutive_awake_count}/{self.consecutive_frames_required}"
                cv2.putText(frame, counter_text, (20, 90), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                # Add frame number
                frame_text = f"Frame: {frame_number}"
                cv2.putText(frame, frame_text, (20, 120), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
                
                # Check if we've achieved required consecutive awake frames
                if self.consecutive_awake_count >= self.consecutive_frames_required:
                    # Add success message
                    cv2.putText(frame, "VERIFIED AWAKE!", (20, 160), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                    cv2.imshow('Awakeness Monitor', frame)
                    cv2.waitKey(1000)  # Show success for 1 second
                    cap.release()
                    cv2.destroyAllWindows()
                    return True
                
                # Display frame
                cv2.imshow('Awakeness Monitor', frame)
                
                # Check for quit commands
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q') or key == 27:  # 'q', 'Q', or ESC
                    break
                    
        except KeyboardInterrupt:
            print("\nMonitoring interrupted by user")
        except Exception as e:
            print(f"Error during video processing: {e}")
        finally:
            # Cleanup
            cap.release()
            cv2.destroyAllWindows()
        
        return False

    def reset_consecutive_count(self) -> None:
        """
        Reset the consecutive awake frame counter.
        
        Useful when starting a new monitoring session or when you want
        to restart the consecutive frame requirement.
        """
        self.consecutive_awake_count = 0

    def get_consecutive_count(self) -> int:
        """
        Get the current consecutive awake frame count.
        
        Returns:
            int: Number of consecutive frames where person was detected as awake
        """
        return self.consecutive_awake_count

    def set_brightness_threshold(self, new_threshold: float) -> None:
        """
        Update the brightness threshold for eye detection.
        
        Args:
            new_threshold (float): New brightness threshold (0-255)
            
        Raises:
            ValueError: If threshold is outside valid range
        """
        if not 0 <= new_threshold <= 255:
            raise ValueError(f"Brightness threshold must be 0-255, got {new_threshold}")
        
        self.brightness_threshold = new_threshold
        self.eye_analyzer.set_brightness_threshold(new_threshold)

    def set_consecutive_frames_required(self, new_count: int) -> None:
        """
        Update the number of consecutive frames required for verification.
        
        Args:
            new_count (int): New consecutive frame requirement (must be >= 1)
            
        Raises:
            ValueError: If count is less than 1
        """
        if new_count < 1:
            raise ValueError(f"Consecutive frames required must be >= 1, got {new_count}")
        
        self.consecutive_frames_required = new_count
        # Reset counter since requirement changed
        self.consecutive_awake_count = 0

    def quick_awakeness_test(self, image: Union[str, np.ndarray], 
                           display_result: bool = True) -> bool:
        """
        Perform a single awakeness test with optional result display.
        
        This is a convenience method for testing the awakeness detection
        on a single image with optional visualization.
        
        Args:
            image: Image to test
            display_result (bool): Whether to display the result image
            
        Returns:
            bool: True if person is awake, False otherwise
        """
        is_awake_result = self.is_awake(image)
        
        if display_result:
            try:
                # Load image for display
                if isinstance(image, str):
                    display_img = cv2.imread(image)
                else:
                    display_img = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                
                if display_img is not None:
                    # Add result text
                    result_text = "AWAKE ✓" if is_awake_result else "SLEEPY ✗"
                    color = (0, 255, 0) if is_awake_result else (0, 0, 255)
                    
                    cv2.putText(display_img, result_text, (20, 50), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 3)
                    
                    cv2.imshow('Awakeness Test Result', display_img)
                    cv2.waitKey(3000)  # Show for 3 seconds
                    cv2.destroyAllWindows()
            except Exception:
                pass  # Silently fail on display errors
        
        return is_awake_result


def main():
    """
    Example usage and testing of the AwakenessChecker class.
    """
    print("AwakenessChecker - Example Usage")
    print("=" * 50)
    
    try:
        # Initialize checker
        checker = AwakenessChecker(
            brightness_threshold=90,
            consecutive_frames_required=3
        )
        
        print("✅ AwakenessChecker initialized successfully")
        print(f"Brightness threshold: {checker.brightness_threshold}")
        print(f"Consecutive frames required: {checker.consecutive_frames_required}")
        
        # Test with synthetic data
        print("\nTesting with synthetic image...")
        test_image = np.random.randint(100, 200, (300, 300, 3), dtype=np.uint8)
        result = checker.is_awake(test_image)
        print(f"Synthetic image test result: {result}")
        
        print("\nTo test with real camera, uncomment the following line:")
        print("# result = checker.check_video_stream(camera_index=0)")
        
        print("\nTo test with a real image file, use:")
        print("# result = checker.quick_awakeness_test('path/to/your/image.jpg')")
        
        print("\n✅ Example completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")


if __name__ == "__main__":
    main()