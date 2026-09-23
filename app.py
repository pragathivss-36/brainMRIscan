import os
import io
import numpy as np
import tensorflow as tf
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename
from PIL import Image

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max limit

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

MODEL_PATH = os.path.join(os.path.dirname(__file__), "PM (1).keras")
print(f"[*] Loading model from: {MODEL_PATH}")

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("[*] Model loaded successfully!")
except Exception as e:
    print(f"[!] Error loading model: {e}")
    model = None

# Exact class labels and order from practice.py
CLASSES = ["Mild Demented", "Moderate Demented", "Non Demented", "Very Mild Demented"]
TARGET_SIZE = (224, 224)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({
            'success': False,
            'error': 'Model failed to load on the server. Please check backend logs.'
        }), 500

    if 'mri_image' not in request.files:
        return jsonify({
            'success': False,
            'error': 'Please select an MRI image file to upload.'
        }), 400

    file = request.files['mri_image']

    if file.filename == '':
        return jsonify({
            'success': False,
            'error': 'No file selected. Please choose a valid image file.'
        }), 400

    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': 'Invalid file format. Please upload a JPG, JPEG, or PNG image.'
        }), 400

    try:
        # Read image file bytes
        file_bytes = file.read()
        
        # Load image with target size matching practice.py
        img = tf.keras.utils.load_img(
            io.BytesIO(file_bytes),
            target_size=TARGET_SIZE
        )
        
        # Convert image to array
        imag_array = tf.keras.utils.img_to_array(img)
        imag_array = np.expand_dims(imag_array, axis=0)

        # Run prediction through PM (1).keras
        predictions = model.predict(imag_array)
        raw_probs = predictions[0]

        # Extract top class and probabilities
        class_index = int(np.argmax(raw_probs))
        predicted_class = CLASSES[class_index]
        top_confidence = float(raw_probs[class_index]) * 100.0

        # Build detailed class breakdown
        prob_breakdown = []
        for i, class_name in enumerate(CLASSES):
            prob_percent = round(float(raw_probs[i]) * 100.0, 2)
            prob_breakdown.append({
                'class_name': class_name,
                'probability': prob_percent,
                'is_top': (i == class_index)
            })

        # Sort breakdown by highest probability first for presentation
        sorted_breakdown = sorted(prob_breakdown, key=lambda x: x['probability'], reverse=True)

        return jsonify({
            'success': True,
            'predicted_class': predicted_class,
            'confidence': round(top_confidence, 2),
            'class_index': class_index,
            'probabilities': prob_breakdown,
            'sorted_probabilities': sorted_breakdown
        })

    except Exception as e:
        print(f"[!] Prediction error: {e}")
        return jsonify({
            'success': False,
            'error': f'Unable to process image. Technical details: {str(e)}'
        }), 500


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
