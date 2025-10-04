"""
Face Recognition Package - Facial Awakeness Detection System

This package provides facial awakeness detection capabilities combining
MTCNN face detection with eye brightness analysis.

Main Components:
- AwakenessChecker: Main API for awakeness detection
- MTCNNFaceDetector: Face detection using MTCNN
- EyeAwakenessAnalyzer: Eye state analysis
- calibrate_threshold: Personalization system

Quick Usage:
    from face_recog.awakeness_checker import AwakenessChecker
    
    checker = AwakenessChecker()
    is_awake = checker.is_awake(image)  # Returns True/False
"""

__version__ = "1.0.0"

# Main API exports
from .awakeness_checker import AwakenessChecker
from .mtcnn_face_detector import MTCNNFaceDetector
from .eye_awareness_analyzer import EyeAwakenessAnalyzer

__all__ = [
    'AwakenessChecker',
    'MTCNNFaceDetector', 
    'EyeAwakenessAnalyzer'
]