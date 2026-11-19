export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  method: string,
  token?: string,
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (data !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    const detail = response.status < 500 && typeof problem?.detail === 'string' ? problem.detail : '';
    const code = typeof problem?.code === 'string' ? problem.code : undefined;
    throw new ApiError(response.status, detail, code);
  }
  if (response.status === 204 || (response.status === 202 && !response.headers.get('content-type')?.includes('json'))) return undefined as T;
  return response.json() as Promise<T>;
}
