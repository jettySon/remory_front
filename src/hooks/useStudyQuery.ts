import { useEffect, useState } from 'react';
import { request } from '../api/request';

type Result<T> = {
  token: string;
  path: string;
  version: number;
  attempt: number;
  data?: T;
  failed: boolean;
};

export function useStudyQuery<T>(token: string | undefined, path: string, version: number) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result<T>>();

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const key = { token, path, version, attempt };
    request<T>(path, 'GET', token, undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ ...key, data, failed: false });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult((previous) => ({
          ...key,
          failed: true,
          data: previous?.token === token && previous.path === path ? previous.data : undefined,
        }));
      });
    return () => controller.abort();
  }, [token, path, version, attempt]);

  const active = token && result?.token === token && result.path === path ? result : undefined;
  const settled = active?.version === version && active.attempt === attempt;
  return {
    data: active?.data,
    loading: Boolean(token && !settled && !active?.data),
    failed: settled && Boolean(active?.failed),
    retry: () => setAttempt((value) => value + 1),
  };
}
