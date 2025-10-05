"""
MTCNN Face Detector Module

This module provides a wrapper class for MTCNN face detection with comprehensive
error handling and visualization capabilities.
"""

import cv2
import numpy as np
from typing import Union, Dict, Any, Optional, Tuple, List
import os
from pathlib import Path

# Prefer the PyTorch-backed MTCNN (facenet-pytorch) because it's easier to
# install and avoids TensorFlow dependency issues. Fall back to the
# tensorflow-based `mtcnn` package if facenet-pytorch isn't installed.
_BACKEND = None
_FACENET = None
try:
    from facenet_pytorch import MTCNN as FacenetMTCNN
    _BACKEND = 'facenet'
    _FACENET = FacenetMTCNN
except Exception:
    try:
        from mtcnn import MTCNN as TfMTCNN
        _BACKEND = 'tensorflow'
        _FACENET = TfMTCNN
    except Exception:
        raise ImportError(
            "No MTCNN backend found. Install either facenet-pytorch (recommended) or mtcnn.\n"
            "Try: pip install facenet-pytorch torch torchvision    # recommended (CPU/GPU wheels vary)\n"
            "Or: pip install mtcnn    # tensorflow-based, requires tensorflow"
        )


class MTCNNFaceDetector:
    """
    A comprehensive face detector using MTCNN (Multi-task CNN) for face detection
    and facial landmark detection.
    
    This class provides methods to detect faces in images, extract facial keypoints,
    and visualize the detection results with bounding boxes and landmarks.
    """

    def __init__(self, min_face_size: int = 20, scale_factor: float = 0.709, 
                 steps_threshold: List[float] = None):
        """
        Initialize the MTCNN face detector.
        
        Args:
            min_face_size (int): Minimum size of face to detect in pixels
            scale_factor (float): Factor used to create a scaling pyramid of face sizes
            steps_threshold (List[float]): Threshold values for the three detection stages
        """
        if steps_threshold is None:
            steps_threshold = [0.6, 0.7, 0.7]
        
        try:
            if _BACKEND == 'facenet':
                # facenet_pytorch.MTCNN parameters differ; use defaults and keep_all=False
                # Use device auto-detection
                self.detector = _FACENET(keep_all=True, device=None)
                self._backend = 'facenet'
            else:
                # tensorflow mtcnn
                self.detector = _FACENET(
                    min_face_size=min_face_size,
                    scale_factor=scale_factor,
                    steps_threshold=steps_threshold
                )
                self._backend = 'tensorflow'
        except Exception as e:
            raise RuntimeError(f"Failed to initialize MTCNN detector: {str(e)}")

    def _load_image(self, image: Union[str, np.ndarray]) -> np.ndarray:
        """
        Load and validate image from path or numpy array.
        
        Args:
            image: Image file path or numpy array
            
        Returns:
            np.ndarray: Loaded image in RGB format
            
        Raises:
            FileNotFoundError: If image path doesn't exist
            ValueError: If image format is invalid
        """
        if isinstance(image, str):
            if not os.path.exists(image):
                raise FileNotFoundError(f"Image file not found: {image}")
            
            # Load image using OpenCV
            img = cv2.imread(image)
            if img is None:
                raise ValueError(f"Could not load image from path: {image}")
            
            # Convert BGR to RGB
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
        elif isinstance(image, np.ndarray):
            img = image.copy()
            
            # Check if image has valid shape
            if len(img.shape) not in [2, 3]:
                raise ValueError(f"Invalid image shape: {img.shape}. Expected 2D or 3D array")
            
            # Convert grayscale to RGB if needed
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)
            elif img.shape[2] == 4:  # RGBA
                img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
            elif img.shape[2] == 3:
                # Assume it's already RGB or BGR - MTCNN expects RGB
                pass
            else:
                raise ValueError(f"Unsupported number of channels: {img.shape[2]}")
        else:
            raise TypeError(f"Image must be a file path (str) or numpy array, got {type(image)}")
        
        return img

    def detect_face(self, image: Union[str, np.ndarray]) -> Dict[str, Any]:
        """
        Detect face in the given image and extract facial landmarks.
        
        Args:
            image: Image file path or numpy array
            
        Returns:
            Dict containing:
                - bounding_box: [x, y, width, height] if face detected, None otherwise
                - confidence: confidence score (0-1) if face detected, None otherwise
                - keypoints: dictionary with facial landmarks if face detected, None otherwise
                    - left_eye: [x, y]
                    - right_eye: [x, y]
                    - nose: [x, y]
                    - mouth_left: [x, y]
                    - mouth_right: [x, y]
                - error: error message if detection failed, None otherwise
                - success: boolean indicating if detection was successful
        """
        result = {
            'bounding_box': None,
            'confidence': None,
            'keypoints': None,
            'error': None,
            'success': False
        }
        
        try:
            # Load and validate image
            img = self._load_image(image)
            
            # Run MTCNN detection. Normalize outputs to match the previous 'mtcnn' package
            # which returned a list of detections each with 'box','confidence','keypoints'.
            if self._backend == 'facenet':
                # facenet_pytorch returns boxes, probs, points
                boxes, probs, points = self.detector.detect(img, landmarks=True)
                if boxes is None or len(boxes) == 0:
                    result['error'] = "No face detected in the image"
                    return result

                if len(boxes) > 1:
                    result['error'] = f"Multiple faces detected ({len(boxes)}). Please use an image with exactly one face"
                    return result

                # single detection
                box = boxes[0]  # [x1, y1, x2, y2]
                x1, y1, x2, y2 = [int(round(v)) for v in box]
                w = x2 - x1
                h = y2 - y1
                result['bounding_box'] = [x1, y1, w, h]
                result['confidence'] = float(probs[0]) if probs is not None else None

                lm = points[0] if points is not None else None  # shape (5,2)
                if lm is not None:
                    # facenet landmark order: left_eye, right_eye, nose, mouth_left, mouth_right
                    result['keypoints'] = {
                        'left_eye': [float(lm[0][0]), float(lm[0][1])],
                        'right_eye': [float(lm[1][0]), float(lm[1][1])],
                        'nose': [float(lm[2][0]), float(lm[2][1])],
                        'mouth_left': [float(lm[3][0]), float(lm[3][1])],
                        'mouth_right': [float(lm[4][0]), float(lm[4][1])]
                    }

                result['success'] = True
                return result
            else:
                # tensorflow mtcnn package API
                detections = self.detector.detect_faces(img)

                if len(detections) == 0:
                    result['error'] = "No face detected in the image"
                    return result

                if len(detections) > 1:
                    result['error'] = f"Multiple faces detected ({len(detections)}). Please use an image with exactly one face"
                    return result

                detection = detections[0]
                bbox = detection['box']
                result['bounding_box'] = [bbox['x'], bbox['y'], bbox['width'], bbox['height']]
                result['confidence'] = detection.get('confidence')
                keypoints = detection.get('keypoints', {})
                result['keypoints'] = {
                    'left_eye': [keypoints['left_eye'][0], keypoints['left_eye'][1]],
                    'right_eye': [keypoints['right_eye'][0], keypoints['right_eye'][1]],
                    'nose': [keypoints['nose'][0], keypoints['nose'][1]],
                    'mouth_left': [keypoints['mouth_left'][0], keypoints['mouth_left'][1]],
                    'mouth_right': [keypoints['mouth_right'][0], keypoints['mouth_right'][1]]
                }

                result['success'] = True
                return result
            
        except FileNotFoundError as e:
            result['error'] = str(e)
            return result
        except ValueError as e:
            result['error'] = f"Image processing error: {str(e)}"
            return result
        except Exception as e:
            result['error'] = f"Unexpected error during face detection: {str(e)}"
            return result

    def draw_detections(self, image: Union[str, np.ndarray], 
                       face_data: Dict[str, Any]) -> Optional[np.ndarray]:
        """
        Draw face detection results on the image.
        
        Args:
            image: Original image (file path or numpy array)
            face_data: Detection results from detect_face method
            
        Returns:
            np.ndarray: Image with drawn detections, or None if drawing failed
        """
        try:
            # Load image
            img = self._load_image(image)
            
            # Check if detection was successful
            if not face_data.get('success', False):
                print(f"Cannot draw detections: {face_data.get('error', 'Detection failed')}")
                return img
            
            # Draw bounding box
            bbox = face_data['bounding_box']
            x, y, w, h = bbox
            
            # Draw rectangle (green color)
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Draw confidence score
            confidence = face_data['confidence']
            cv2.putText(img, f'Conf: {confidence:.3f}', (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            # Draw keypoints
            keypoints = face_data['keypoints']
            keypoint_colors = {
                'left_eye': (255, 0, 0),     # Red
                'right_eye': (255, 0, 0),    # Red
                'nose': (0, 0, 255),         # Blue
                'mouth_left': (255, 255, 0), # Yellow
                'mouth_right': (255, 255, 0) # Yellow
            }
            
            for point_name, point_coords in keypoints.items():
                x_point, y_point = int(point_coords[0]), int(point_coords[1])
                color = keypoint_colors.get(point_name, (255, 255, 255))
                
                # Draw circle for keypoint
                cv2.circle(img, (x_point, y_point), 3, color, -1)
                
                # Draw label
                cv2.putText(img, point_name.replace('_', ' '), 
                           (x_point + 5, y_point - 5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            
            return img
            
        except Exception as e:
            print(f"Error drawing detections: {str(e)}")
            return None

    def detect_and_visualize(self, image: Union[str, np.ndarray], 
                           save_path: Optional[str] = None, 
                           display: bool = True) -> Tuple[Dict[str, Any], Optional[np.ndarray]]:
        """
        Convenience method to detect face and visualize results in one call.
        
        Args:
            image: Image file path or numpy array
            save_path: Optional path to save the visualization
            display: Whether to display the image using cv2.imshow
            
        Returns:
            Tuple of (detection_results, visualization_image)
        """
        # Detect face
        face_data = self.detect_face(image)
        
        # Create visualization
        vis_img = self.draw_detections(image, face_data)
        
        # Save if path provided
        if save_path and vis_img is not None:
            # Convert RGB back to BGR for saving with OpenCV
            save_img = cv2.cvtColor(vis_img, cv2.COLOR_RGB2BGR)
            cv2.imwrite(save_path, save_img)
            print(f"Visualization saved to: {save_path}")
        
        # Display if requested
        if display and vis_img is not None:
            # Convert RGB to BGR for display
            display_img = cv2.cvtColor(vis_img, cv2.COLOR_RGB2BGR)
            cv2.imshow('MTCNN Face Detection', display_img)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
        
        return face_data, vis_img


def main():
    """
    Example usage of the MTCNNFaceDetector class.
    """
    # Initialize detector
    detector = MTCNNFaceDetector()
    
    # Example with a sample image path (replace with actual image path)
    image_path = "sample_face.jpg"
    
    try:
        # Detect face
        result = detector.detect_face(image_path)
        
        if result['success']:
            print("Face detection successful!")
            print(f"Bounding box: {result['bounding_box']}")
            print(f"Confidence: {result['confidence']:.3f}")
            print("Keypoints:")
            for point_name, coords in result['keypoints'].items():
                print(f"  {point_name}: ({coords[0]:.1f}, {coords[1]:.1f})")
            
            # Visualize results
            vis_img = detector.draw_detections(image_path, result)
            if vis_img is not None:
                print("Visualization created successfully")
        else:
            print(f"Face detection failed: {result['error']}")
            
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    main()