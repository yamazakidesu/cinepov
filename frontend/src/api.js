// Satu pintu untuk semua request ke backend.
async function request(path, options) {
  let res
  try {
    res = await fetch(path, options)
  } catch {
    // server mati / tidak terjangkau
    throw new Error('Tidak bisa terhubung ke server')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request gagal (${res.status})`)
  return data
}

export const api = {
  movies: () => request('/api/movies'),
  movie: (id) => request(`/api/movies/${id}`),
  showtime: (id) => request(`/api/showtimes/${id}`),
  seats: (id) => request(`/api/showtimes/${id}/seats`),
  book: (body) =>
    request('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  ticket: (code) => request(`/api/bookings/${encodeURIComponent(code)}`),
}