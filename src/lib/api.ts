export async function login(email: string, dob: string, role: 'student' | 'coordinator' | 'admin') {
  try {
    // determine base API URL at build time. For mobile builds set VITE_API_URL
    // e.g. VITE_API_URL="https://api.myhost.com" or for emulator use http://10.0.2.2:3000
    const BASE = (import.meta.env.VITE_API_URL as string) || '';

    // map frontend coordinator/admin to backend 'staff'
    const backendRole = role === 'student' ? 'student' : 'staff';
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: dob, role: backendRole }),
    });

    if (!res.ok) {
      // Try parse JSON error body first
      let parsed: any = null;
      try {
        parsed = await res.json();
      } catch (e) {
        // not JSON, try text
        try {
          const txt = await res.text();
          parsed = { message: txt || res.statusText };
        } catch (e2) {
          parsed = { message: res.statusText || 'Login failed' };
        }
      }

      const message = (parsed && parsed.message) || `Request failed (${res.status})`;
      throw new Error(message);
    }

    return res.json();
  } catch (err: any) {
    // network or parsing error
    const msg = err?.message || 'Network error during login';
    throw new Error(msg);
  }
}

export async function fetchRoutes() {
  const BASE = (import.meta.env.VITE_API_URL as string) || '';
  const res = await fetch(`${BASE}/routes`);
  if (!res.ok) {
    // try to surface server HTML or text errors
    let txt = '';
    try {
      txt = await res.text();
    } catch (e) {}
    throw new Error(txt || `Failed to fetch routes (${res.status})`);
  }

  // ensure we only call json() when response is JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  // fallback: read as text and throw helpful error
  const body = await res.text();
  throw new Error(body || 'Expected JSON response from /routes');
}

// Helper: parse a Response as JSON if it is JSON, otherwise return text wrapped in an error
export async function parseResponseSafely(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  const text = await res.text();
  throw new Error(text || `Unexpected response (status ${res.status})`);
}
