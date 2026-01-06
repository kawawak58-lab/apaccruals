const API_BASE =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "";

export async function apiFetch(path, options = {}) {
  try {
    return await fetch(`${API_BASE}${path}`, options);
  } catch (err) {
    console.error("apiFetch network error:", err);
    return new Response(null, { status: 500 });
  }
}
