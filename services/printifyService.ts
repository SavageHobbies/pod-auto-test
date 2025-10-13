export type TestResult = {
  ok: boolean;
  status: number;
  message?: string;
};

const PRINTIFY_SHOPS_URL = 'https://api.printify.com/v1/shops.json';

export async function testConnection(apiKey: string, timeoutMs = 8000): Promise<TestResult> {
  if (!apiKey) return { ok: false, status: 0, message: 'No API key provided' };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(PRINTIFY_SHOPS_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(id);

    if (!res.ok) {
      let msg = res.statusText || 'Unknown error';
      try {
        const body = await res.json();
        if (body && body.error) msg = body.error;
      } catch (e) {
        // ignore parse error
      }
      return { ok: false, status: res.status, message: msg };
    }

    return { ok: true, status: res.status };
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      return { ok: false, status: 0, message: 'Request timed out' };
    }
    return { ok: false, status: 0, message: err?.message || String(err) };
  }
}

export default { testConnection };
