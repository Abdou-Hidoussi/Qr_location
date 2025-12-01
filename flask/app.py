import os
from datetime import datetime

from flask_cors import CORS
from pymongo import MongoClient

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# MongoDB connection setup - adjust URI as needed

client = MongoClient(host='mongodb://devinov:Devinov2022$@162.19.233.48:27017/?authMechanism=DEFAULT',
                         port=27017)
db  = client["Arbi_Qr"] # replace with your DB name
collection = db['Scans']  # replace with your collection name

users = {
    "user 1": "password123",
    "user 2": "mypassword123",
    "user 3": "password321",
    "user 4": "mypassword321",
    "user 5": "pass123word"
}

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "username and password required"}), 400

    # Check credentials
    if username in users and users[username] == password:
        return jsonify({"message": "Login successful"}), 200

    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/')
def map_view():
    # Fetch all documents with username, time, and location
    data = list(collection.find({}, {'_id': 0, 'username': 1, 'time': 1, 'location': 1, 'qr_data': 1}))
    # Expect location: {'lat': ..., 'lng': ...}
    return render_template('map.html', data=data)

@app.route('/api/scan', methods=['POST'])

def save_scan():
    data = request.json

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    username = data.get('username')
    qr_data = data.get('qr_data')
    location = data.get('location')
    timestamp = data.get('timestamp')


    if not qr_data or not location or not timestamp:
        return jsonify({'error': 'Missing fields'}), 400

    try:

        timestamp_dt = datetime.fromisoformat(timestamp)

    except Exception:

        return jsonify({'error': 'Invalid timestamp format'}), 400


    scan_doc = {

        'username': username,
        'qr_data': qr_data,
        'location': location,
        'time': timestamp_dt

    }

    collection.insert_one(scan_doc)

    return jsonify({'message': 'Scan saved'}), 201


if __name__ == '__main__':
    app.run(debug=True)
