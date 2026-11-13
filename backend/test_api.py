#API test untuk backend
from app import app

client = app.test_client()


def check(label, condition):
    print(("OK   " if condition else "GAGAL"), label)
    if not condition:
        raise SystemExit(1)


# 1. Film dan jadwal
movies = client.get("/api/movies").get_json()
check("ada 5 film", len(movies) == 5)

detail = client.get("/api/movies/1").get_json()
check("film 1 punya jadwal", len(detail["showtimes"]) > 0)
sid = detail["showtimes"][0]["id"]

# 2. Kursi
seats = client.get(f"/api/showtimes/{sid}/seats").get_json()["seats"]
by_label = {s["label"]: s for s in seats}
check("jumlah kursi = baris x kolom", len(seats) in (9 * 14, 8 * 12))
check("A1 belum terisi", by_label["A1"]["taken"] is False)
check("baris B sekitar 1 m lebih jauh dari baris A",
      round(by_label["B4"]["distance_m"] - by_label["A4"]["distance_m"], 1) == 1.0)

# 3. Booking pertama berhasil
body = {"showtime_id": sid, "seats": [{"row": "B", "col": 4}, {"row": "B", "col": 5}],
        "name": "Kazu", "email": "kazu@contoh.id"}
r1 = client.post("/api/bookings", json=body)
check("booking pertama = 201", r1.status_code == 201)
code = r1.get_json()["code"]

# 4. Booking kursi yang sama harus DITOLAK
r2 = client.post("/api/bookings", json=body)
check("booking kursi sama = 409", r2.status_code == 409)

# 5. Kursi sekarang tercatat terisi
seats = client.get(f"/api/showtimes/{sid}/seats").get_json()["seats"]
taken = sorted(s["label"] for s in seats if s["taken"])
check("B4 dan B5 terisi", taken == ["B4", "B5"])

# 6. Tiket bisa dibaca lagi dari kode booking
ticket = client.get(f"/api/bookings/{code}").get_json()
check("tiket berisi 2 kursi", len(ticket["seats"]) == 2)

# 7. Input jelek ditolak
bad = dict(body, seats=[{"row": "Z", "col": 99}])
check("kursi tidak valid = 400", client.post("/api/bookings", json=bad).status_code == 400)
check("email salah = 400", client.post("/api/bookings", json=dict(body, email="x")).status_code == 400)

print("\nSemua tes lolos.")