import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { HTTPException } from "hono/http-exception";
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';

type MileAPIOptions = {
  s3?: {
    filePrefix?: string;
  };
};

export function MileAPI(options: MileAPIOptions) {
  const app = new Hono().basePath('/api/mile');
  app.onError((err, c) => {
    console.log("err", err.message);
    if (err instanceof HTTPException) {
      // Get the custom response
      return err.getResponse();
    }
    return c.json({ message: err.message ?? "Error" }, 400);
  });

  app.route('/github', github)

  return handle(app);
}

const github = new Hono();

github.get('/login', (c) => {
  return c.redirect('/mile/setup');
});
github.get('/created-app', async (c) => {
  const searchParams = new URL(c.req.url, 'https://localhost').searchParams;
  const code = searchParams.get('code');
  if (typeof code !== 'string' || !/^[a-zA-Z0-9]+$/.test(code)) {
    return c.text('Bad Request', 400);
  }
  const ghAppRes = await fetch(
    `https://api.github.com/app-manifests/${code}/conversions`,
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
    }
  );
  if (!ghAppRes.ok) {
    console.log(ghAppRes);
    return c.text('An error occurred while creating the GitHub App', 500);
  }
  const ghAppDataRaw: any = await ghAppRes.json();
  console.log('ghAppDataRaw', ghAppDataRaw);
  // let ghAppDataResult;
  // try {
  //   ghAppDataResult = s.create(ghAppDataRaw, ghAppSchema);
  // } catch {
  //   console.log(ghAppDataRaw);
  //   return c.text('An unexpected response was received from GitHub', 500);
  // }
  const toAddToEnv = `# Keystatic
KEYSTATIC_GITHUB_CLIENT_ID=${ghAppDataRaw.client_id}
KEYSTATIC_GITHUB_CLIENT_SECRET=${ghAppDataRaw.client_secret}
KEYSTATIC_SECRET=${randomBytes(40).toString('hex')}
PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=${ghAppDataRaw.slug} # https://github.com/apps/${ghAppDataRaw.slug}
`;
  let prevEnv: string | undefined;
  try {
    prevEnv = await fs.readFile('.env', 'utf-8');
  } catch (err) {
    if ((err as any).code !== 'ENOENT') throw err;
  }
  const newEnv = prevEnv ? `${prevEnv}\n\n${toAddToEnv}` : toAddToEnv;
  await fs.writeFile('.env', newEnv);
  await wait(200);
  return c.redirect('/mile/created-github-app?slug=' + ghAppDataRaw.slug);
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
