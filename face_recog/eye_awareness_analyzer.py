"""
Eye Awareness Analyzer Module

This module provides a class to analyze whether eyes are open or closed based on
brightness analysis of eye regions. The core principle is that open eyes show
bright sclera while closed eyes show darker eyelids.
"""

import cv2
import numpy as np
from typing import Dict, Tuple, Any, Union
import os


class EyeAwakenessAnalyzer:
    """
    Analyzes eye regions to determine if eyes are open or closed based on brightness.
    
    The analyzer works on the principle that open eyes contain bright sclera (white parts)
    while closed eyes show darker eyelids. It extracts eye regions and calculates
    mean brightness to make the determination.
    """

    def __init__(self, brightness_threshold: float = 90.0, 
                 eye_region_size: Tuple[int, int] = (30, 20)):
        """
        Initialize the Eye Awareness Analyzer.
        
        Args:
            brightness_threshold (float): Threshold value for determining if eye is open.
                                        Values above this are considered "open eyes".
                                        Default is 90 (on 0-255 scale).
            eye_region_size (Tuple[int, int]): Size of the rectangular region to extract
                                             around each eye in pixels (width, height).
                                             Default is (30, 20).
        """
        self.brightness_threshold = brightness_threshold
        self.eye_region_size = eye_region_size
        
        # Validate parameters
        if not 0 <= brightness_threshold <= 255:
            raise ValueError(f"Brightness threshold must be between 0 and 255, got {brightness_threshold}")
        
        if eye_region_size[0] <= 0 or eye_region_size[1] <= 0:
            raise ValueError(f"Eye region size must be positive, got {eye_region_size}")

    def extract_eye_region(self, image: np.ndarray, eye_center: Tuple[float, float], 
                          region_size: Tuple[int, int] = None) -> np.ndarray:
        """
        Extract a rectangular region around the eye center.
        
        Args:
            image (np.ndarray): Input image (RGB or BGR format)
            eye_center (Tuple[float, float]): Center coordinates of the eye (x, y)
            region_size (Tuple[int, int], optional): Size of region to extract (width, height).
                                                   If None, uses self.eye_region_size.
        
        Returns:
            np.ndarray: Extracted eye region image
            
        Raises:
            ValueError: If eye center is outside image bounds or region size is invalid
        """
        if region_size is None:
            region_size = self.eye_region_size
        
        # Validate inputs
        if len(image.shape) not in [2, 3]:
            raise ValueError(f"Image must be 2D or 3D array, got shape {image.shape}")
        
        height, width = image.shape[:2]
        eye_x, eye_y = int(eye_center[0]), int(eye_center[1])
        region_width, region_height = region_size
        
        # Calculate region bounds
        half_width = region_width // 2
        half_height = region_height // 2
        
        # Calculate extraction coordinates with bounds checking
        x1 = max(0, eye_x - half_width)
        y1 = max(0, eye_y - half_height)
        x2 = min(width, eye_x + half_width)
        y2 = min(height, eye_y + half_height)
        
        # Ensure we have a valid region
        if x2 <= x1 or y2 <= y1:
            raise ValueError(f"Invalid eye region: eye center ({eye_x}, {eye_y}) "
                           f"with region size {region_size} is outside image bounds")
        
        # Extract the region
        eye_region = image[y1:y2, x1:x2]
        
        # If the extracted region is smaller than requested, pad it
        if eye_region.shape[0] < region_height or eye_region.shape[1] < region_width:
            if len(image.shape) == 3:
                padded_region = np.zeros((region_height, region_width, image.shape[2]), dtype=image.dtype)
            else:
                padded_region = np.zeros((region_height, region_width), dtype=image.dtype)
            
            # Calculate padding offsets
            pad_top = (region_height - eye_region.shape[0]) // 2
            pad_left = (region_width - eye_region.shape[1]) // 2
            
            # Place the extracted region in the center of the padded region
            if len(image.shape) == 3:
                padded_region[pad_top:pad_top + eye_region.shape[0], 
                             pad_left:pad_left + eye_region.shape[1], :] = eye_region
            else:
                padded_region[pad_top:pad_top + eye_region.shape[0], 
                             pad_left:pad_left + eye_region.shape[1]] = eye_region
            
            eye_region = padded_region
        
        return eye_region

    def calculate_eye_brightness(self, eye_region: np.ndarray) -> float:
        """
        Calculate the mean brightness of an eye region.
        
        Args:
            eye_region (np.ndarray): Eye region image (RGB, BGR, or grayscale)
        
        Returns:
            float: Mean brightness value (0-255 scale)
            
        Raises:
            ValueError: If eye region is empty or invalid
        """
        if eye_region.size == 0:
            raise ValueError("Eye region is empty")
        
        # Convert to grayscale if needed
        if len(eye_region.shape) == 3:
            # Convert to grayscale using standard weights
            if eye_region.shape[2] == 3:
                # Assume RGB or BGR - use standard grayscale conversion
                gray_region = cv2.cvtColor(eye_region, cv2.COLOR_RGB2GRAY)
            elif eye_region.shape[2] == 4:
                # RGBA - convert to RGB first, then grayscale
                rgb_region = cv2.cvtColor(eye_region, cv2.COLOR_RGBA2RGB)
                gray_region = cv2.cvtColor(rgb_region, cv2.COLOR_RGB2GRAY)
            else:
                raise ValueError(f"Unsupported number of channels: {eye_region.shape[2]}")
        else:
            # Already grayscale
            gray_region = eye_region
        
        # Calculate mean brightness
        mean_brightness = float(np.mean(gray_region))
        
        return mean_brightness

    def is_eye_open(self, eye_region: np.ndarray) -> bool:
        """
        Determine if an eye is open based on brightness analysis.
        
        Args:
            eye_region (np.ndarray): Eye region image
        
        Returns:
            bool: True if eye appears to be open, False if closed
        """
        try:
            brightness = self.calculate_eye_brightness(eye_region)
            return brightness > self.brightness_threshold
        except Exception:
            # If calculation fails, assume eye is closed (safer default)
            return False

    def analyze_both_eyes(self, image: np.ndarray, 
                         left_eye_pos: Tuple[float, float], 
                         right_eye_pos: Tuple[float, float]) -> Dict[str, Any]:
        """
        Analyze both eyes to determine their open/closed state.
        
        Args:
            image (np.ndarray): Input image containing the face
            left_eye_pos (Tuple[float, float]): Position of left eye center (x, y)
            right_eye_pos (Tuple[float, float]): Position of right eye center (x, y)
        
        Returns:
            Dict containing:
                - 'left_eye': {'is_open': bool, 'brightness': float}
                - 'right_eye': {'is_open': bool, 'brightness': float}
                - 'both_eyes_open': bool
                - 'analysis_successful': bool
                - 'error': str (if analysis failed)
        """
        result = {
            'left_eye': {'is_open': False, 'brightness': 0.0},
            'right_eye': {'is_open': False, 'brightness': 0.0},
            'both_eyes_open': False,
            'analysis_successful': False,
            'error': None
        }
        
        try:
            # Validate input image
            if image is None or image.size == 0:
                raise ValueError("Invalid or empty image")
            
            # Extract and analyze left eye
            try:
                left_eye_region = self.extract_eye_region(image, left_eye_pos)
                left_brightness = self.calculate_eye_brightness(left_eye_region)
                left_is_open = left_brightness > self.brightness_threshold
                
                result['left_eye'] = {
                    'is_open': left_is_open,
                    'brightness': left_brightness
                }
            except Exception as e:
                result['error'] = f"Left eye analysis failed: {str(e)}"
                return result
            
            # Extract and analyze right eye
            try:
                right_eye_region = self.extract_eye_region(image, right_eye_pos)
                right_brightness = self.calculate_eye_brightness(right_eye_region)
                right_is_open = right_brightness > self.brightness_threshold
                
                result['right_eye'] = {
                    'is_open': right_is_open,
                    'brightness': right_brightness
                }
            except Exception as e:
                result['error'] = f"Right eye analysis failed: {str(e)}"
                return result
            
            # Determine if both eyes are open
            result['both_eyes_open'] = (result['left_eye']['is_open'] and 
                                      result['right_eye']['is_open'])
            
            result['analysis_successful'] = True
            
        except Exception as e:
            result['error'] = f"Analysis failed: {str(e)}"
        
        return result

    def analyze_single_eye(self, image: np.ndarray, 
                          eye_pos: Tuple[float, float]) -> Dict[str, Any]:
        """
        Analyze a single eye to determine its open/closed state.
        
        Args:
            image (np.ndarray): Input image containing the eye
            eye_pos (Tuple[float, float]): Position of eye center (x, y)
        
        Returns:
            Dict containing:
                - 'is_open': bool
                - 'brightness': float
                - 'analysis_successful': bool
                - 'error': str (if analysis failed)
        """
        result = {
            'is_open': False,
            'brightness': 0.0,
            'analysis_successful': False,
            'error': None
        }
        
        try:
            # Extract eye region
            eye_region = self.extract_eye_region(image, eye_pos)
            
            # Calculate brightness
            brightness = self.calculate_eye_brightness(eye_region)
            
            # Determine if eye is open
            is_open = brightness > self.brightness_threshold
            
            result.update({
                'is_open': is_open,
                'brightness': brightness,
                'analysis_successful': True
            })
            
        except Exception as e:
            result['error'] = f"Single eye analysis failed: {str(e)}"
        
        return result

    def visualize_eye_analysis(self, image: np.ndarray, 
                              left_eye_pos: Tuple[float, float],
                              right_eye_pos: Tuple[float, float],
                              analysis_result: Dict[str, Any]) -> np.ndarray:
        """
        Create a visualization showing eye regions and analysis results.
        
        Args:
            image (np.ndarray): Original image
            left_eye_pos (Tuple[float, float]): Left eye position
            right_eye_pos (Tuple[float, float]): Right eye position
            analysis_result (Dict): Result from analyze_both_eyes()
        
        Returns:
            np.ndarray: Image with visualization overlays
        """
        vis_image = image.copy()
        
        if not analysis_result['analysis_successful']:
            return vis_image
        
        # Draw eye region rectangles
        for eye_pos, eye_name in [(left_eye_pos, 'left'), (right_eye_pos, 'right')]:
            x, y = int(eye_pos[0]), int(eye_pos[1])
            w, h = self.eye_region_size
            
            # Calculate rectangle coordinates
            x1 = x - w // 2
            y1 = y - h // 2
            x2 = x + w // 2
            y2 = y + h // 2
            
            # Choose color based on eye state
            eye_data = analysis_result[f'{eye_name}_eye']
            color = (0, 255, 0) if eye_data['is_open'] else (0, 0, 255)  # Green if open, red if closed
            
            # Draw rectangle
            cv2.rectangle(vis_image, (x1, y1), (x2, y2), color, 2)
            
            # Add text label
            label = f"{eye_name.capitalize()}: {'Open' if eye_data['is_open'] else 'Closed'}"
            label += f" ({eye_data['brightness']:.1f})"
            
            cv2.putText(vis_image, label, (x1, y1 - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        # Add overall status
        overall_status = "Both Eyes Open" if analysis_result['both_eyes_open'] else "Eyes Closed/Partially Closed"
        cv2.putText(vis_image, overall_status, (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        return vis_image

    def set_brightness_threshold(self, new_threshold: float) -> None:
        """
        Update the brightness threshold for eye open/closed determination.
        
        Args:
            new_threshold (float): New threshold value (0-255)
            
        Raises:
            ValueError: If threshold is outside valid range
        """
        if not 0 <= new_threshold <= 255:
            raise ValueError(f"Brightness threshold must be between 0 and 255, got {new_threshold}")
        
        self.brightness_threshold = new_threshold

    def set_eye_region_size(self, new_size: Tuple[int, int]) -> None:
        """
        Update the eye region extraction size.
        
        Args:
            new_size (Tuple[int, int]): New region size (width, height)
            
        Raises:
            ValueError: If size values are not positive
        """
        if new_size[0] <= 0 or new_size[1] <= 0:
            raise ValueError(f"Eye region size must be positive, got {new_size}")
        
        self.eye_region_size = new_size


def main():
    """
    Example usage of the EyeAwakenessAnalyzer class.
    """
    # Initialize analyzer
    analyzer = EyeAwakenessAnalyzer(brightness_threshold=90, eye_region_size=(30, 20))
    
    print("Eye Awareness Analyzer - Example Usage")
    print("=" * 50)
    
    # Create a sample image for demonstration
    # In real usage, you would load an actual image with detected eye positions
    sample_image = np.random.randint(0, 255, (200, 200, 3), dtype=np.uint8)
    
    # Example eye positions (in real usage, these would come from face detection)
    left_eye_pos = (60, 80)   # (x, y)
    right_eye_pos = (140, 80)  # (x, y)
    
    # Analyze both eyes
    result = analyzer.analyze_both_eyes(sample_image, left_eye_pos, right_eye_pos)
    
    if result['analysis_successful']:
        print("✅ Eye analysis successful!")
        print(f"Left eye - Open: {result['left_eye']['is_open']}, "
              f"Brightness: {result['left_eye']['brightness']:.1f}")
        print(f"Right eye - Open: {result['right_eye']['is_open']}, "
              f"Brightness: {result['right_eye']['brightness']:.1f}")
        print(f"Both eyes open: {result['both_eyes_open']}")
    else:
        print(f"❌ Analysis failed: {result['error']}")
    
    # Example of analyzing a single eye
    print("\nSingle eye analysis:")
    single_result = analyzer.analyze_single_eye(sample_image, left_eye_pos)
    if single_result['analysis_successful']:
        print(f"Single eye - Open: {single_result['is_open']}, "
              f"Brightness: {single_result['brightness']:.1f}")
    
    print("\n✅ Example completed!")


if __name__ == "__main__":
    main()