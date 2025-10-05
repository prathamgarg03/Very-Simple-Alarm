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

def run_awakeness_test(cap, checker, test_duration=5, window_name='Awakeness Detection Demo'):
    """Run an awakeness detection loop for a fixed duration.

    This encapsulates the timed loop used in the demo. It will display the
    camera frames, annotate them with awakeness status, and print a short
    summary at the end. The function will release the capture and close the
    OpenCV windows before returning a results dict.
    """
    import time
    import cv2

    start_time = time.time()
    awake_count = 0
    total_count = 0

    while time.time() - start_time < test_duration:
        ret, frame = cap.read()
        if not ret:
            break

        # Check awakeness
        try:
            is_awake = checker.is_awake(frame)
        except Exception:
            # If the checker fails for a frame, consider it not awake but continue
            is_awake = False

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

        cv2.imshow(window_name, frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Clean up windows and capture
    try:
        cap.release()
    except Exception:
        pass
    try:
        cv2.destroyAllWindows()
    except Exception:
        pass

    # Results
    print(f"\n📊 Test Results:")
    print(f"   Total frames processed: {total_count}")
    print(f"   Frames detected as awake: {awake_count}")
    if total_count > 0:
        awake_percentage = (awake_count / total_count) * 100
        print(f"   Awake percentage: {awake_percentage:.1f}%")

    return {
        'total': total_count,
        'awake': awake_count,
        'percentage': (awake_count / total_count * 100) if total_count > 0 else 0.0,
    }

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
            # In WSL the camera device is often not available. Try falling back
            # to a sample image so the demo can still exercise the pipeline.
            sample_dir = os.path.join(os.path.dirname(__file__), 'samples')
            sample_img = os.path.join(sample_dir, 'sample_face.jpg')
            if os.path.exists(sample_img):
                print(f"Using sample image for headless demo: {sample_img}")
                try:
                    is_awake = checker.quick_awakeness_test(sample_img, display_result=False)
                    print('Sample image result:', 'AWAKE' if is_awake else 'NOT AWAKE')
                except Exception as e:
                    print('Sample image test failed:', e)
            else:
                print("No sample image found at 'face_recog/samples/sample_face.jpg'.")
                print("Running a short simulated headless demo instead (no camera / image required).")
                # Simulate a short sequence of frames with deterministic awakeness toggles
                import time
                total_count = 5
                awake_count = 0
                for i in range(total_count):
                    # simple deterministic pattern: awake on even frames
                    is_awake = (i % 2 == 0)
                    awake_count += 1 if is_awake else 0
                    status = 'AWAKE' if is_awake else 'NOT AWAKE'
                    print(f"[sim] Frame {i+1}/{total_count}: {status}")
                    time.sleep(0.3)

                print(f"\n📊 Simulated Test Results:")
                print(f"   Total frames processed: {total_count}")
                print(f"   Frames detected as awake: {awake_count}")
                print(f"   Awake percentage: {(awake_count/total_count)*100:.1f}%")
                print("\n🎉 Simulated demo completed.")
            return
        
        print("   Camera opened - testing for 5 seconds...")
        print("   Press 'q' to quit early")

        # Use the reusable timed tester for the camera path
        try:
            results = run_awakeness_test(cap, checker, test_duration=5,
                                         window_name='Awakeness Detection Demo')
            print(f"\n🎉 Demo completed successfully!")
            print(f"   The system is working and ready for integration")
        except Exception as e:
            print('Error during camera test:', e)
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("   Make sure to install requirements first:")
        print("   pip install -r requirements.txt")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("   This might be due to missing camera or TensorFlow issues")

if __name__ == "__main__":
    simple_demo()