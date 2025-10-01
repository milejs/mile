import { Config } from "@milejs/types";
import { parse } from "cookie";

export function getSyncAuth(config: Config) {
  if (typeof document === 'undefined') {
    return null;
  }
  if (config.storage.kind === 'github') {
    const cookies = parse(document.cookie);
    const accessToken = cookies['mile-gh-access-token'];
    if (!accessToken) {
      return null;
    }
    return { accessToken };
  }
  return null;
}

let _refreshTokenPromise: Promise<{ accessToken: string } | null> | undefined;

export async function getAuth(config: Config) {
  const token = getSyncAuth(config);
  console.log('token', token);

  if (config.storage.kind === 'github' && !token) {
    if (!_refreshTokenPromise) {
      _refreshTokenPromise = (async () => {
        try {
          const res = await fetch('/api/keystatic/github/refresh-token', {
            method: 'POST',
          });
          if (res.status === 200) {
            const cookies = parse(document.cookie);
            const accessToken = cookies['mile-gh-access-token'];
            if (accessToken) {
              return { accessToken };
            }
          }
        } catch {
        } finally {
          _refreshTokenPromise = undefined;
        }
        return null;
      })();
    }
    return _refreshTokenPromise;
  }
  return token;
}
