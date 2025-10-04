"""
Brightness Threshold Calibration Script

This module provides calibration functionality to automatically determine the optimal
brightness threshold for eye open/closed detection based on individual users,
lighting conditions, and camera setups.
"""

import cv2
import numpy as np
import os
import time
from typing import List, Tuple, Optional
import statistics

try:
    from mtcnn_face_detector import MTCNNFaceDetector
    from eye_awareness_analyzer import EyeAwakenessAnalyzer
except ImportError as e:
    raise ImportError(
        f"Required modules not found: {e}. "
        "Make sure mtcnn_face_detector.py and eye_awareness_analyzer.py are available."
    )


CONFIG_FILE = "threshold_config.txt"


def calibrate_brightness_threshold(camera_index: int = 0, frames_per_state: int = 10) -> int:
    """
    Calibrate the brightness threshold for eye open/closed detection.
    
    This function guides the user through a calibration process where they
    capture frames with eyes open and closed to determine the optimal threshold.
    
    Args:
        camera_index (int): Camera device index (default: 0)
        frames_per_state (int): Number of frames to capture for each state (default: 10)
    
    Returns:
        int: Calibrated brightness threshold value
        
    Raises:
        RuntimeError: If camera cannot be opened or face detection fails
    """
    print("🎯 Brightness Threshold Calibration")
    print("=" * 50)
    print("This will help determine the best threshold for YOUR specific setup.")
    print("Make sure you have good lighting and your face is clearly visible.\n")
    
    # Initialize detectors
    try:
        face_detector = MTCNNFaceDetector()
        # Use a neutral threshold for calibration
        eye_analyzer = EyeAwakenessAnalyzer(brightness_threshold=90)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize detectors: {e}")
    
    # Open camera
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open camera {camera_index}")
    
    # Set camera properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    try:
        # Storage for brightness values
        open_eye_brightness = []
        closed_eye_brightness = []
        
        # Phase 1: Capture frames with eyes OPEN
        print("📸 PHASE 1: Eyes OPEN Calibration")
        print("-" * 30)
        print(f"Instructions:")
        print(f"1. Keep your eyes WIDE OPEN")
        print(f"2. Look directly at the camera")
        print(f"3. Press SPACE to capture {frames_per_state} frames")
        print(f"4. Hold still during capture")
        print("\nPress SPACE when ready...")
        
        open_brightness = _capture_brightness_frames(
            cap, face_detector, eye_analyzer, frames_per_state, "EYES OPEN"
        )
        open_eye_brightness.extend(open_brightness)
        
        print(f"✅ Captured {len(open_brightness)} valid open-eye measurements")
        
        # Phase 2: Capture frames with eyes CLOSED
        print("\n📸 PHASE 2: Eyes CLOSED Calibration")
        print("-" * 30)
        print(f"Instructions:")
        print(f"1. CLOSE your eyes completely")
        print(f"2. Keep your head in the same position")
        print(f"3. Press SPACE to capture {frames_per_state} frames")
        print(f"4. Keep eyes closed during entire capture")
        print("\nPress SPACE when ready...")
        
        closed_brightness = _capture_brightness_frames(
            cap, face_detector, eye_analyzer, frames_per_state, "EYES CLOSED"
        )
        closed_eye_brightness.extend(closed_brightness)
        
        print(f"✅ Captured {len(closed_brightness)} valid closed-eye measurements")
        
    finally:
        cap.release()
        cv2.destroyAllWindows()
    
    # Validate we have enough data
    if len(open_eye_brightness) < 5 or len(closed_eye_brightness) < 5:
        raise RuntimeError(
            f"Insufficient calibration data. Got {len(open_eye_brightness)} open-eye "
            f"and {len(closed_eye_brightness)} closed-eye measurements. Need at least 5 each."
        )
    
    # Calculate statistics
    open_avg = statistics.mean(open_eye_brightness)
    closed_avg = statistics.mean(closed_eye_brightness)
    open_std = statistics.stdev(open_eye_brightness) if len(open_eye_brightness) > 1 else 0
    closed_std = statistics.stdev(closed_eye_brightness) if len(closed_eye_brightness) > 1 else 0
    
    # Calculate recommended threshold (midpoint)
    recommended_threshold = (open_avg + closed_avg) / 2
    
    # Apply safety margin (be more strict - lower threshold)
    safety_margin = 5
    strict_threshold = int(recommended_threshold - safety_margin)
    
    # Ensure threshold is within reasonable bounds
    strict_threshold = max(30, min(200, strict_threshold))
    
    # Display results
    print(f"\n📊 Calibration Results")
    print("=" * 30)
    print(f"Eyes Open Average: {open_avg:.1f}")
    print(f"Eyes Open Std Dev: {open_std:.1f}")
    print(f"Eyes Closed Average: {closed_avg:.1f}")
    print(f"Eyes Closed Std Dev: {closed_std:.1f}")
    print(f"Recommended Threshold: {recommended_threshold:.1f}")
    print(f"Using Strict Threshold: {strict_threshold}")
    
    # Analyze the separation
    separation = open_avg - closed_avg
    print(f"\nBrightness Separation: {separation:.1f}")
    
    if separation > 50:
        print("✅ Excellent separation - calibration should work very well")
    elif separation > 30:
        print("😊 Good separation - calibration should work well")
    elif separation > 15:
        print("⚠️  Moderate separation - may need better lighting")
    else:
        print("❌ Poor separation - consider improving lighting or camera angle")
    
    # Save to configuration file
    _save_threshold_config(strict_threshold, open_avg, closed_avg, separation)
    
    print(f"\n💾 Threshold saved to '{CONFIG_FILE}'")
    print(f"🎯 Calibration complete! Use threshold: {strict_threshold}")
    
    return strict_threshold


def _capture_brightness_frames(cap: cv2.VideoCapture, 
                              face_detector: MTCNNFaceDetector,
                              eye_analyzer: EyeAwakenessAnalyzer,
                              target_frames: int, 
                              phase_name: str) -> List[float]:
    """
    Capture frames and extract brightness values for calibration.
    
    Args:
        cap: OpenCV video capture object
        face_detector: MTCNN face detector instance
        eye_analyzer: Eye analyzer instance
        target_frames: Number of frames to capture
        phase_name: Name of the current phase for display
    
    Returns:
        List of brightness values from captured frames
    """
    brightness_values = []
    frames_captured = 0
    
    # Wait for user to press space
    while True:
        ret, frame = cap.read()
        if not ret:
            continue
        
        # Display instruction
        cv2.putText(frame, phase_name, (20, 50), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 255), 3)
        cv2.putText(frame, "Press SPACE to start capture", (20, 100), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(frame, "Press Q to quit", (20, 130), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        
        cv2.imshow('Threshold Calibration', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord(' '):  # Space key
            break
        elif key == ord('q') or key == ord('Q'):
            raise KeyboardInterrupt("Calibration cancelled by user")
    
    # Capture frames
    print(f"Capturing {target_frames} frames...")
    capture_start_time = time.time()
    
    while frames_captured < target_frames:
        ret, frame = cap.read()
        if not ret:
            continue
        
        # Convert to RGB for face detection
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Detect face
        face_result = face_detector.detect_face(frame_rgb)
        
        if face_result.get('success', False):
            try:
                # Extract eye positions
                keypoints = face_result['keypoints']
                left_eye_pos = tuple(keypoints['left_eye'])
                right_eye_pos = tuple(keypoints['right_eye'])
                
                # Extract eye regions and calculate brightness
                left_eye_region = eye_analyzer.extract_eye_region(frame_rgb, left_eye_pos)
                right_eye_region = eye_analyzer.extract_eye_region(frame_rgb, right_eye_pos)
                
                left_brightness = eye_analyzer.calculate_eye_brightness(left_eye_region)
                right_brightness = eye_analyzer.calculate_eye_brightness(right_eye_region)
                
                # Store both eye brightness values
                brightness_values.extend([left_brightness, right_brightness])
                frames_captured += 1
                
                # Visual feedback
                status_text = f"Captured: {frames_captured}/{target_frames}"
                cv2.putText(frame, phase_name, (20, 50), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
                cv2.putText(frame, status_text, (20, 100), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                cv2.putText(frame, f"L: {left_brightness:.1f}, R: {right_brightness:.1f}", 
                           (20, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                
            except Exception as e:
                # Skip frame if processing fails
                cv2.putText(frame, "Processing error - keep trying", (20, 160), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 1)
        else:
            # No face detected
            cv2.putText(frame, phase_name, (20, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
            cv2.putText(frame, "No face detected - adjust position", (20, 100), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        cv2.imshow('Threshold Calibration', frame)
        
        # Allow early exit
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == ord('Q'):
            raise KeyboardInterrupt("Calibration cancelled by user")
        
        # Add small delay to avoid too rapid capture
        time.sleep(0.1)
    
    capture_duration = time.time() - capture_start_time
    print(f"Capture completed in {capture_duration:.1f} seconds")
    
    return brightness_values


def _save_threshold_config(threshold: int, open_avg: float, closed_avg: float, separation: float) -> None:
    """
    Save calibration results to configuration file.
    
    Args:
        threshold: Calibrated threshold value
        open_avg: Average brightness for open eyes
        closed_avg: Average brightness for closed eyes
        separation: Brightness separation between open and closed
    """
    try:
        with open(CONFIG_FILE, 'w') as f:
            f.write(f"# Brightness Threshold Calibration Results\n")
            f.write(f"# Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"threshold={threshold}\n")
            f.write(f"open_avg={open_avg:.2f}\n")
            f.write(f"closed_avg={closed_avg:.2f}\n")
            f.write(f"separation={separation:.2f}\n")
    except Exception as e:
        print(f"Warning: Could not save configuration file: {e}")


def load_calibrated_threshold() -> int:
    """
    Load calibrated threshold from configuration file.
    
    Returns:
        int: Calibrated threshold value, or default 90 if file doesn't exist
    """
    if not os.path.exists(CONFIG_FILE):
        print(f"No calibration file found. Using default threshold: 90")
        return 90
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('threshold='):
                    threshold = int(line.split('=')[1])
                    print(f"Loaded calibrated threshold: {threshold}")
                    return threshold
        
        print(f"Threshold not found in {CONFIG_FILE}. Using default: 90")
        return 90
        
    except Exception as e:
        print(f"Error reading {CONFIG_FILE}: {e}. Using default threshold: 90")
        return 90


def get_calibration_info() -> Optional[dict]:
    """
    Get detailed calibration information from configuration file.
    
    Returns:
        dict: Calibration information, or None if file doesn't exist
    """
    if not os.path.exists(CONFIG_FILE):
        return None
    
    info = {}
    try:
        with open(CONFIG_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    try:
                        # Try to convert to number
                        if '.' in value:
                            info[key] = float(value)
                        else:
                            info[key] = int(value)
                    except ValueError:
                        info[key] = value
        return info
    except Exception as e:
        print(f"Error reading calibration info: {e}")
        return None


def validate_calibration() -> bool:
    """
    Validate that the current calibration is reasonable.
    
    Returns:
        bool: True if calibration seems valid, False otherwise
    """
    info = get_calibration_info()
    if not info:
        return False
    
    try:
        threshold = info.get('threshold', 0)
        open_avg = info.get('open_avg', 0)
        closed_avg = info.get('closed_avg', 0)
        separation = info.get('separation', 0)
        
        # Basic validation checks
        if not (30 <= threshold <= 200):
            return False
        
        if separation < 10:  # Too little separation
            return False
        
        if closed_avg >= open_avg:  # Inverted values
            return False
        
        return True
        
    except Exception:
        return False


def recalibrate_if_needed() -> int:
    """
    Check if recalibration is needed and offer to recalibrate.
    
    Returns:
        int: Current or newly calibrated threshold
    """
    if validate_calibration():
        threshold = load_calibrated_threshold()
        info = get_calibration_info()
        
        print("Current calibration:")
        print(f"  Threshold: {threshold}")
        print(f"  Separation: {info.get('separation', 'Unknown'):.1f}")
        
        response = input("Recalibrate? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            return calibrate_brightness_threshold()
        else:
            return threshold
    else:
        print("No valid calibration found. Starting calibration...")
        return calibrate_brightness_threshold()


def main():
    """
    Main function for interactive calibration.
    """
    print("Brightness Threshold Calibration Tool")
    print("=" * 40)
    
    try:
        if os.path.exists(CONFIG_FILE):
            print(f"Existing calibration found in '{CONFIG_FILE}'")
            info = get_calibration_info()
            if info and validate_calibration():
                print(f"Current threshold: {info.get('threshold')}")
                print(f"Brightness separation: {info.get('separation', 0):.1f}")
                
                response = input("\nRecalibrate? (y/N): ").strip().lower()
                if response not in ['y', 'yes']:
                    print("Using existing calibration.")
                    return
        
        # Run calibration
        threshold = calibrate_brightness_threshold()
        
        print(f"\n🎉 Calibration complete!")
        print(f"Your optimal threshold: {threshold}")
        print(f"\nTo use this in your code:")
        print(f"from calibrate_threshold import load_calibrated_threshold")
        print(f"threshold = load_calibrated_threshold()")
        print(f"checker = AwakenessChecker(brightness_threshold=threshold)")
        
    except KeyboardInterrupt:
        print("\n\nCalibration cancelled by user.")
    except Exception as e:
        print(f"\nError during calibration: {e}")
        print("Try again with better lighting or camera positioning.")


if __name__ == "__main__":
    main()