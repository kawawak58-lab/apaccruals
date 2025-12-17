const API_BASE =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "";

export function apiFetch(path, options) {
   const url = `${API_BASE}${path}`;
  //  alert(url);
  return fetch(`${API_BASE}${path}`, options);
}
