#!/usr/bin/env python3
"""
Simple Demo - Shows how to use the facial awakeness detection system

This is a minimal example that demonstrates the main functionality.
Run this after installing the requirements to test the system.
"""

import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def simple_demo():
    """Simple demonstration of the awakeness checker."""
    print("🎯 Facial Awakeness Detection - Simple Demo")
    print("=" * 45)
    
    try:
        print("📦 Loading awakeness detection system...")
        from awakeness_checker import AwakenessChecker
        
        print("✅ System loaded successfully!")
        print("\n🔧 Initializing awakeness checker...")
        checker = AwakenessChecker()
        
        print("✅ Awakeness checker ready!")
        print(f"   Brightness threshold: {checker.brightness_threshold}")
        
        print("\n📸 Testing with camera...")
        print("   This will open your camera for a few seconds")
        print("   Look at the camera and blink normally")
        
        # Test with camera for a few frames
        import cv2
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("❌ Could not open camera")
            return
        
        print("   Camera opened - testing for 5 seconds...")
        print("   Press 'q' to quit early")
        
        import time
        start_time = time.time()
        awake_count = 0
        total_count = 0
        
        while time.time() - start_time < 5:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Check awakeness
            is_awake = checker.is_awake(frame)
            total_count += 1
            if is_awake:
                awake_count += 1
            
            # Display result
            status = "AWAKE" if is_awake else "NOT AWAKE"
            color = (0, 255, 0) if is_awake else (0, 0, 255)
            
            cv2.putText(frame, f"Status: {status}", (20, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            cv2.putText(frame, "Press 'q' to quit", (20, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.imshow('Awakeness Detection Demo', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        
        # Results
        print(f"\n📊 Test Results:")
        print(f"   Total frames processed: {total_count}")
        print(f"   Frames detected as awake: {awake_count}")
        if total_count > 0:
            awake_percentage = (awake_count / total_count) * 100
            print(f"   Awake percentage: {awake_percentage:.1f}%")
        
        print(f"\n🎉 Demo completed successfully!")
        print(f"   The system is working and ready for integration")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure to install requirements first:")
        print("   pip install -r requirements.txt")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("   This might be due to missing camera or TensorFlow issues")

if __name__ == "__main__":
    simple_demo()