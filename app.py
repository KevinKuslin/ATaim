from ultralytics import YOLO
from datetime import datetime
from flask import Flask, render_template, Response
import cv2
import sqlite3
import os
import numpy as np
import face_recognition

# Path model dan database
MODEL_PATH = "model/best.pt" 
FACES_DIR = "faces" 
DB_PATH = "presensi.db"

# Load wajah-wajah yang dikenali dari folder 'faces'
known_face_encodings = []
known_face_names = []

for filename in os.listdir(FACES_DIR):
    if not filename.lower().endswith((".jpg", ".jpeg", ".png")):
        continue

    path = os.path.join(FACES_DIR, filename)
    
    try:
        # Load image
        image = face_recognition.load_image_file(path)
        
        # Pastikan image terbaca
        if image is None or image.size == 0:
            print(f"[WARN] File {filename} kosong/corrupt, skip")
            continue
        
        # Pastikan dtype uint8
        if image.dtype != np.uint8:
            image = (image * 255).astype(np.uint8)
        
        # Pastikan RGB
        if len(image.shape) == 2:  # grayscale -> RGB
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:  # RGBA -> RGB
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif image.shape[2] == 3:  # BGR -> RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Dapatkan face encoding
        encodings = face_recognition.face_encodings(image)
        if encodings:
            known_face_encodings.append(encodings[0])
            known_face_names.append(os.path.splitext(filename)[0])
            print(f"[INFO] Loaded encoding for {filename}")
        else:
            print(f"[WARN] Tidak ada wajah terdeteksi di {filename}")
    
    except Exception as e:
        print(f"[ERROR] Gagal memproses {filename}: {e}")

print(f"[INFO] Total wajah dimuat: {len(known_face_encodings)}")

import cv2
import face_recognition
import sqlite3
from flask import Flask, Response, jsonify
from datetime import datetime

# ==============================
# Konfigurasi Database
# ==============================
conn = sqlite3.connect("presensi.db", check_same_thread=False)
c = conn.cursor()
c.execute("""
CREATE TABLE IF NOT EXISTS presensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT,
    status TEXT,
    waktu TEXT
)
""")
conn.commit()

def reset_presensi():
    c.execute("DELETE FROM presensi")
    conn.commit()

def sudah_terdeteksi(nama):
    row = c.execute("SELECT 1 FROM presensi WHERE nama=? AND status='Hadir'", (nama,)).fetchone()
    return row is not None

def tandai_hadir(nama):
    waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ada = c.execute("SELECT 1 FROM presensi WHERE nama=? AND status='Hadir'", (nama,)).fetchone()
    if not ada:
        c.execute("INSERT INTO presensi (nama, status, waktu) VALUES (?, 'Hadir', ?)", (nama, waktu))
        conn.commit()

def get_status_presensi():
    daftar_anak = [
        "Jonea Kristiawan",
        "Kevin Jovani Kuslin",
        "Kevin Tanwiputra",
        "Adriel Bernhard Tanuhariono"
    ]
    rows = c.execute("SELECT nama FROM presensi WHERE status='Hadir'").fetchall()
    hadir_set = {row[0] for row in rows}
    hasil = []
    for nama in daftar_anak:
        status = "Hadir" if nama in hadir_set else "Belum Hadir"
        hasil.append({"nama": nama, "status": status})
    return hasil

# Daftar anak-anak
daftar_anak = ["Adriel Bernhard T", "Jonea Kristiawan", "Kevin Tanwiputra", "Kevin Jiovanni Kuslin"]

# Load YOLOv8-OBB model
model = YOLO(MODEL_PATH)

def get_status_presensi(daftar_anak):
    c.execute("SELECT nama, waktu FROM presensi WHERE status = 'Hadir'")
    hasil = c.fetchall()
    nama_hadir = set(nama for nama, _ in hasil)
    tidak_hadir = [nama for nama in daftar_anak if nama not in nama_hadir]
    return hasil, tidak_hadir 

import cv2
from flask import Flask, Response, render_template, jsonify, request 

app = Flask(__name__)

# Buka kamera sekali (global)
camera = cv2.VideoCapture(0) 

def gen():
    while True:
        success, frame = camera.read()
        if not success:
            break

        results = model.predict(source=frame, conf=0.75, stream=True)

        for r in results:
            if r.obb is not None and hasattr(r.obb, "xywhr"):
                cls_list = r.obb.cls.cpu().numpy().astype(int)
                names = model.names

                for cls in cls_list:
                    nama_terdeteksi = names[cls] if cls in names else f"Unknown-{cls}"
                    if nama_terdeteksi in daftar_anak:
                        if not sudah_terdeteksi(nama_terdeteksi):
                            tandai_hadir(nama_terdeteksi)
                            print(f"[INFO] {nama_terdeteksi} TERDETEKSI - disimpan ke database")

            # Tambah overlay
            annotated_frame = r.plot()

            _, buffer = cv2.imencode('.jpg', annotated_frame) 
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    # Ambil nama yang sudah hadir dari database
    rows = c.execute("SELECT nama FROM presensi WHERE status='Hadir' ORDER BY waktu DESC").fetchall()
    nama_list = [row[0] for row in rows]
    
    # Render template dan kirim nama_list
    return render_template('html/index.html', nama_list=nama_list)

@app.route('/video_feed')
def video_feed():
    return Response(gen(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/api/status_presensi")
def status_presensi():
    rows = c.execute("SELECT nama, status FROM presensi ORDER BY waktu DESC").fetchall()
    return jsonify([{"nama": r[0], "status": r[1]} for r in rows])


@app.route("/reset_presensi", methods=["POST"])
def reset_presensi_route():
    c.execute("DELETE FROM presensi")  # hapus semua data presensi
    conn.commit()
    return "OK", 200

@app.route('/student')
def student():
    return render_template("html/studentlog.html") 

@app.route("/api/update_status", methods=["POST"])
def update_status():
    data = request.get_json()
    nama = data.get("nama")
    status = data.get("status")
    waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Cek apakah sudah ada record untuk nama ini
    row = c.execute("SELECT id FROM presensi WHERE nama=?", (nama,)).fetchone()
    if row:
        # Update status
        c.execute("UPDATE presensi SET status=?, waktu=? WHERE id=?", (status, waktu, row[0]))
    else:
        # Insert baru
        c.execute("INSERT INTO presensi (nama, status, waktu) VALUES (?, ?, ?)", (nama, status, waktu))
    conn.commit()
    return jsonify({"success": True})


if __name__ == "__main__":
    try:
        # Jalankan Flask
        app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
    finally:
        # Kamera dilepas hanya saat server dihentikan (Ctrl+C)
        if camera.isOpened():
            camera.release()
            print("✅ Kamera dilepas dengan aman")