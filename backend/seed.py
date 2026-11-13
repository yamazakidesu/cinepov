import os
import sqlite3
from datetime import datetime, timedelta

DB_PATH = os.environ.get("CINEPOV_DB", os.path.join(os.path.dirname(__file__), "cinepov.db"))

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  age_rating TEXT NOT NULL,
  director TEXT NOT NULL,
  synopsis TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS halls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL,
  cols INTEGER NOT NULL,
  aisle_after TEXT NOT NULL,          -- "3,11": lorong setelah kolom 3 dan 11
  front_distance_m REAL NOT NULL,     -- jarak baris A ke layar
  row_pitch_m REAL NOT NULL,          -- jarak antar baris
  seat_pitch_m REAL NOT NULL,         -- lebar satu kursi
  riser_m REAL NOT NULL,              -- kenaikan lantai per baris
  screen_width_m REAL NOT NULL,
  screen_height_m REAL NOT NULL,
  screen_bottom_m REAL NOT NULL       -- tinggi tepi bawah layar dari lantai
);

CREATE TABLE IF NOT EXISTS showtimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id),
  hall_id INTEGER NOT NULL REFERENCES halls(id),
  starts_at TEXT NOT NULL,            -- ISO 8601, contoh 2026-11-12T19:45
  base_price INTEGER NOT NULL         -- rupiah
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  showtime_id INTEGER NOT NULL REFERENCES showtimes(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_seats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  showtime_id INTEGER NOT NULL REFERENCES showtimes(id),
  row_label TEXT NOT NULL,
  col INTEGER NOT NULL,
  price INTEGER NOT NULL,
  UNIQUE (showtime_id, row_label, col)   -- mencegah double-booking
);
"""

MOVIES = [
    ("Orbit 9", "Fiksi ilmiah", 134, "13+", "Raka Wirabuana",
     "Kru stasiun luar angkasa menemukan sinyal dari masa depan mereka sendiri. Waktu mereka tinggal sembilan orbit."),
    ("Lampu Terakhir di Stasiun Kota", "Drama", 118, "13+", "Nadia Prameswari",
     "Penjaga stasiun tua harus memutuskan apakah akan mematikan lampu terakhir sebelum stasiun dirobohkan."),
    ("Pasar Malam Hantu", "Horor", 101, "17+", "Sinta Aryani",
     "Tiga sahabat masuk ke pasar malam yang hanya buka saat gerhana. Semua yang dijual di sana punya harga tersembunyi."),
    ("Kopi Pagi, Hujan Sore", "Komedi romantis", 96, "SU", "Dimas Hartono",
     "Dua barista dari kedai yang bersaing terjebak banjir di satu gedung semalaman dan terpaksa berbagi dapur."),
    ("Garis Finis", "Aksi", 126, "17+", "Bimo Santoso",
     "Mantan pembalap jalanan dipaksa kembali ke lintasan terakhirnya untuk menyelamatkan adiknya dari lilitan utang."),
]

# name, rows, cols, aisle_after, front_distance, row_pitch, seat_pitch, riser, screen_w, screen_h, screen_bottom
HALLS = [
    ("Aurum Hall 3", 9, 14, "3,11", 5.3, 0.97, 0.62, 0.20, 12.4, 5.2, 1.6),
    ("Aurum Hall 1", 8, 12, "3,9", 4.8, 0.97, 0.62, 0.20, 10.8, 4.6, 1.5),
]


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # hasil query bisa diakses pakai nama kolom
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def seed(reset=True):
    if reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = connect()
    conn.executescript(SCHEMA)
    cur = conn.cursor()

    cur.executemany(
        "INSERT INTO movies (title, genre, duration_min, age_rating, director, synopsis) VALUES (?,?,?,?,?,?)",
        MOVIES,
    )
    cur.executemany(
        "INSERT INTO halls (name, rows, cols, aisle_after, front_distance_m, row_pitch_m, seat_pitch_m,"
        " riser_m, screen_width_m, screen_height_m, screen_bottom_m) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        HALLS,
    )

    # 3 hari ke depan, tiap film 3 jam tayang per hari
    today = datetime.now().replace(minute=0, second=0, microsecond=0)
    slots = [(17, 30), (19, 45), (22, 15)]
    rows = []
    for day in range(3):
        for movie_id in range(1, len(MOVIES) + 1):
            for i, (h, m) in enumerate(slots):
                hall_id = 1 if (movie_id + i + day) % 2 == 0 else 2
                start = (today + timedelta(days=day)).replace(hour=h, minute=m)
                base = 45000 if i != 1 else 60000   # jam tengah (IMAX) lebih mahal
                rows.append((movie_id, hall_id, start.isoformat(timespec="minutes"), base))
    cur.executemany(
        "INSERT INTO showtimes (movie_id, hall_id, starts_at, base_price) VALUES (?,?,?,?)", rows
    )

    conn.commit()
    conn.close()
    print(f"Seed selesai: {len(MOVIES)} film, {len(HALLS)} studio, {len(rows)} jadwal -> {DB_PATH}")


if __name__ == "__main__":
    seed()