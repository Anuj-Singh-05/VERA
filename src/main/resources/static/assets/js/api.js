// Thin client for the VERA REST API. Same origin only; no external requests.
// ?fixture=<name> loads a static JSON report from assets/data/fixtures/ for state testing;
// the page shows a "Fixture data" banner whenever that is active.

const params = new URLSearchParams(location.search);
export const FIXTURE = params.get('fixture');

export class ApiError extends Error {
  constructor(message, kind, status) {
    super(message);
    this.kind = kind; // 'unreachable' | 'http'
    this.status = status;
  }
}

async function request(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = timeoutMs ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  let res;
  try {
    res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    throw new ApiError('The VERA service did not respond.', 'unreachable');
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw new ApiError(`The service answered with status ${res.status}.`, 'http', res.status);
  return res.json();
}

async function fixture(name) {
  const data = await request(`assets/data/fixtures/${encodeURIComponent(FIXTURE)}.json`);
  return data[name];
}

export const api = {
  report: () => (FIXTURE ? fixture('report') : request('/api/report')),
  runs: () => (FIXTURE ? fixture('runs') : request('/api/runs')),
  reviewLog: () => (FIXTURE ? fixture('reviewLog') : request('/api/review/log')),
  // A live run takes 4 to 5 minutes and cannot be cancelled: no client timeout.
  run: () => (FIXTURE ? Promise.reject(new ApiError('Runs are disabled while fixture data is shown. Remove ?fixture= from the address to use the service.', 'http', 400)) : request('/api/run', { method: 'POST' }, 0)),
  review: (batch, approve, reviewer, reason) => {
    if (FIXTURE) return Promise.reject(new ApiError('Reviews are disabled with fixture data.', 'http', 400));
    const q = new URLSearchParams({ approve: String(approve), reviewer, reason });
    return request(`/api/review/${encodeURIComponent(batch)}?${q}`, { method: 'POST' });
  },
};
