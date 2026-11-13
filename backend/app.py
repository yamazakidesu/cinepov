#API CINEPOV
import math
import secrets
import sqlite3
import string
from datetime import datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from seed import connect

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

ROW_LABELS = string.ascii_uppercase #A, B, C, ...
MAX_SEATS = 6 # Maximum seats per row
LOUNGE_ROWS = 2 # Number of rows that are considered "lounge" seats
LOUNGE_SURCHARGE = 30000 # Surcharge for lounge seats (IN RUPIAH)

#studio geometry functions
def aisles_of(hall):
    return [int(x) for x in hall["aisle_after"].split(",") if x]


def seat_x(hall, col):
    """Jarak kursi dari garis tengah layar, dalam meter (negatif = kiri)."""
    aisles = aisles_of(hall)
    aisle_w = hall["seat_pitch_m"]  # lebar lorong = satu kursi
    total = hall["cols"] * hall["seat_pitch_m"] + len(aisles) * aisle_w
    gaps = sum(1 for a in aisles if col > a)  # berapa lorong di kiri kursi ini
    return (col - 1) * hall["seat_pitch_m"] + gaps * aisle_w + hall["seat_pitch_m"] / 2 - total / 2


def seat_z(hall, row_index):
    """Jarak kursi ke layar, dalam meter."""
    return hall["front_distance_m"] + row_index * hall["row_pitch_m"]


def view_angle_deg(hall, row_index, col):
    """Seberapa lebar layar terlihat dari kursi ini (derajat)."""
    z, x = seat_z(hall, row_index), seat_x(hall, col)
    half = hall["screen_width_m"] / 2
    return round(math.degrees(math.atan2(half - x, z) - math.atan2(-half - x, z)))


def is_lounge(hall, row_index):
    return row_index >= hall["rows"] - LOUNGE_ROWS


def zone_of(hall, row_index):
    ratio = row_index / max(hall["rows"] - 1, 1)
    if ratio < 0.3:
        return "Dekat layar"
    if ratio < 0.8:
        return "Posisi terbaik"
    return "Tampak utuh"


def seat_price(hall, showtime, row_index):
    price = showtime["base_price"]
    if is_lounge(hall, row_index):
        price += LOUNGE_SURCHARGE
    return price

# Error handling and utility functions
def error(message, status=400):
    return jsonify({"error": message}), status


def hall_dict(hall):
    d = dict(hall)
    d["aisle_after"] = aisles_of(hall)  # "3,11" -> [3, 11]
    return d


def get_showtime(conn, showtime_id):
    st = conn.execute("SELECT * FROM showtimes WHERE id = ?", (showtime_id,)).fetchone()
    if st is None:
        return None, None
    hall = conn.execute("SELECT * FROM halls WHERE id = ?", (st["hall_id"],)).fetchone()
    return st, hall

# API endpoints
@app.get("/api/health")
def health():
    return jsonify({"ok": True})


@app.get("/api/movies")
def list_movies():
    conn = connect()
    movies = conn.execute("SELECT * FROM movies ORDER BY id").fetchall()
    conn.close()
    return jsonify([dict(m) for m in movies])


@app.get("/api/movies/<int:movie_id>")
def movie_detail(movie_id):
    conn = connect()
    movie = conn.execute("SELECT * FROM movies WHERE id = ?", (movie_id,)).fetchone()
    if movie is None:
        conn.close()
        return error("Film tidak ditemukan", 404)
    now = datetime.now().isoformat(timespec="minutes")
    showtimes = conn.execute(
        "SELECT s.id, s.starts_at, s.base_price, h.name AS hall_name "
        "FROM showtimes s JOIN halls h ON h.id = s.hall_id "
        "WHERE s.movie_id = ? AND s.starts_at >= ? ORDER BY s.starts_at",
        (movie_id, now),
    ).fetchall()
    conn.close()
    return jsonify({"movie": dict(movie), "showtimes": [dict(s) for s in showtimes]})


@app.get("/api/showtimes/<int:showtime_id>")
def showtime_detail(showtime_id):
    conn = connect()
    st, hall = get_showtime(conn, showtime_id)
    if st is None:
        conn.close()
        return error("Jadwal tidak ditemukan", 404)
    movie = conn.execute("SELECT * FROM movies WHERE id = ?", (st["movie_id"],)).fetchone()
    conn.close()
    return jsonify({"showtime": dict(st), "movie": dict(movie), "hall": hall_dict(hall)})


@app.get("/api/showtimes/<int:showtime_id>/seats")
def showtime_seats(showtime_id):
    conn = connect()
    st, hall = get_showtime(conn, showtime_id)
    if st is None:
        conn.close()
        return error("Jadwal tidak ditemukan", 404)
    taken = {
        (r["row_label"], r["col"])
        for r in conn.execute(
            "SELECT row_label, col FROM booking_seats WHERE showtime_id = ?", (showtime_id,)
        )
    }
    conn.close()

    seats = []
    for r in range(hall["rows"]):
        label = ROW_LABELS[r]
        for c in range(1, hall["cols"] + 1):
            seats.append({
                "row": label,
                "col": c,
                "label": f"{label}{c}",
                "kind": "lounge" if is_lounge(hall, r) else "standar",
                "zone": zone_of(hall, r),
                "price": seat_price(hall, st, r),
                "distance_m": round(seat_z(hall, r), 1),
                "offset_m": round(seat_x(hall, c), 1),
                "view_angle_deg": view_angle_deg(hall, r, c),
                "taken": (label, c) in taken,
            })
    return jsonify({"seats": seats})


def make_code(conn):
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # tanpa O/0/I/1 supaya tidak membingungkan
    while True:
        code = "CP" + "".join(secrets.choice(alphabet) for _ in range(6))
        if conn.execute("SELECT 1 FROM bookings WHERE code = ?", (code,)).fetchone() is None:
            return code


@app.post("/api/bookings")
def create_booking():
    data = request.get_json(silent=True) or {}
    showtime_id = data.get("showtime_id")
    seats = data.get("seats") or []
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()

    if not isinstance(showtime_id, int):
        return error("showtime_id wajib diisi")
    if not name or len(name) > 80:
        return error("Nama wajib diisi (maksimal 80 karakter)")
    if "@" not in email or len(email) > 120:
        return error("Email tidak valid")
    if not seats:
        return error("Pilih minimal satu kursi")
    if len(seats) > MAX_SEATS:
        return error(f"Maksimal {MAX_SEATS} kursi per pesanan")

    conn = connect()
    try:
        st, hall = get_showtime(conn, showtime_id)
        if st is None:
            return error("Jadwal tidak ditemukan", 404)

        # Validasi kursi, dan hitung harga di SERVER (jangan percaya harga dari klien).
        chosen, seen = [], set()
        for s in seats:
            row = str(s.get("row", "")).upper()
            col = s.get("col")
            if len(row) != 1 or row not in ROW_LABELS[: hall["rows"]]:
                return error("Kursi tidak valid")
            if not isinstance(col, int) or not (1 <= col <= hall["cols"]):
                return error("Kursi tidak valid")
            if (row, col) in seen:
                return error("Ada kursi yang dobel dalam satu pesanan")
            seen.add((row, col))
            chosen.append((row, col, seat_price(hall, st, ROW_LABELS.index(row))))

        total = sum(price for _, _, price in chosen)
        code = make_code(conn)

        try:
            with conn:  # commit kalau semua berhasil, rollback otomatis kalau ada error
                cur = conn.execute(
                    "INSERT INTO bookings (code, showtime_id, name, email, total, created_at) "
                    "VALUES (?,?,?,?,?,?)",
                    (code, showtime_id, name, email, total, datetime.now().isoformat(timespec="seconds")),
                )
                conn.executemany(
                    "INSERT INTO booking_seats (booking_id, showtime_id, row_label, col, price) "
                    "VALUES (?,?,?,?,?)",
                    [(cur.lastrowid, showtime_id, r, c, p) for r, c, p in chosen],
                )
        except sqlite3.IntegrityError:
            # Kena aturan UNIQUE: ada kursi yang baru saja dibeli orang lain.
            return error("Ada kursi yang baru saja dipesan orang lain. Pilih kursi lain.", 409)

        return jsonify({"code": code, "total": total}), 201
    finally:
        conn.close()

#booking detail endpoint
@app.get("/api/bookings/<code>")
def booking_detail(code):
    conn = connect()
    b = conn.execute("SELECT * FROM bookings WHERE code = ?", (code.upper(),)).fetchone()
    if b is None:
        conn.close()
        return error("Booking tidak ditemukan", 404)
    st, hall = get_showtime(conn, b["showtime_id"])
    movie = conn.execute("SELECT * FROM movies WHERE id = ?", (st["movie_id"],)).fetchone()
    seats = conn.execute(
        "SELECT row_label, col, price FROM booking_seats WHERE booking_id = ? ORDER BY row_label, col",
        (b["id"],),
    ).fetchall()
    conn.close()
    return jsonify({
        "code": b["code"],
        "name": b["name"],
        "email": b["email"],
        "total": b["total"],
        "created_at": b["created_at"],
        "starts_at": st["starts_at"],
        "movie": movie["title"],
        "hall": hall["name"],
        "seats": [{"label": f"{s['row_label']}{s['col']}", "price": s["price"]} for s in seats],
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=True)