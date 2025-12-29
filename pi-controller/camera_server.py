import io
import time
import os
import signal
from flask import Flask, Response
from flask_cors import CORS
from picamera2 import Picamera2

app = Flask(__name__)
CORS(app) # This enables CORS for all routes

#Initialize Camera
try:
    picam2 = Picamera2()
    config = picam2.create_preview_configuration(main={"format": "XRGB8888", "size": (640, 480)})
    picam2.configure(config)
    picam2.start()
    print("Camera successfully started and configured.")
except Exception as e:
    print(f"Failed to start camera: {e}")

def generate_frames():
    while True:
        try:
            # Capture into a byte buffer
            buf = io.BytesIO()
            picam2.capture_file(buf, format='jpeg')
            frame = buf.getvalue()
            
            if not frame:
                continue

            # Standard MJPEG streaming format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            
            # 20 FPS
            time.sleep(0.05)
        except Exception as e:
            print(f"Error during capture loop: {e}")
            break

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/health')
def health():
    return "OK", 200

@app.route('/')
def index():
    return """
    <html>
      <head><title>Surf Cam</title></head>
      <body style="color: black; text-align: center;">
        <h1>Surf Cam Live</h1>
        <img src="/video_feed" style="width: 70%; border: 2px solid white;">
      </body>
    </html>
    """

if __name__ == '__main__':
    # threaded=True is vital for MJPEG streaming
    app.run(
        host='0.0.0.0', 
        port=5000, 
        threaded=True,
        ssl_context=(
            'opi-1.tail5cc970.ts.net.crt', 
            'opi-1.tail5cc970.ts.net.key'
            )
    )