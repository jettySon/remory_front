import { useEffect, useState } from 'react';

export function useStoredState<T>(key: string, initial: T): [T, (next: T | ((v: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 브라우저가 저장을 차단해도 현재 화면에서 선택한 값을 사용한다.
    }
  }, [key, value]);
  return [value, setValue];
}
