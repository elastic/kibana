/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as Fs } from 'fs';
import Os from 'os';
import Path from 'path';

// `child_process.exec` is mocked per test so we can return canned `git`
// output without spawning real processes.
jest.mock('child_process', () => {
  const exec = jest.fn();
  return {
    __esModule: true,
    exec,
    default: { exec },
  };
});

const tmpRoot = Fs.mkdtemp(Path.join(Os.tmpdir(), 'my-teams-test-'));

jest.mock('@kbn/repo-info', () => {
  let root = '';
  return {
    get REPO_ROOT() {
      return root;
    },
    __setRoot: (value: string) => {
      root = value;
    },
  };
});

interface RegisteredRoute {
  config: unknown;
  handler: (
    ctx: unknown,
    req: unknown,
    res: { ok: (arg?: { body?: unknown }) => unknown }
  ) => Promise<unknown>;
}

const createFakeRouter = (): { router: { get: jest.Mock }; registered: RegisteredRoute[] } => {
  const registered: RegisteredRoute[] = [];
  const router = {
    get: jest.fn((config: unknown, handler: unknown) => {
      registered.push({ config, handler } as RegisteredRoute);
    }),
  };
  return { router, registered };
};

type FakeLogger = import('@kbn/core/server').Logger;
const createFakeLogger = (): FakeLogger =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    get: jest.fn((): FakeLogger => createFakeLogger()),
  } as unknown as FakeLogger);

const writeManifest = async (dir: string, content: object): Promise<void> => {
  await Fs.mkdir(dir, { recursive: true });
  await Fs.writeFile(Path.join(dir, 'kibana.jsonc'), JSON.stringify(content, null, 2), 'utf8');
};

type ExecMock = jest.Mock;

const stubGit = (
  exec: ExecMock,
  response: { email?: string; files?: string[]; emailError?: Error; logError?: Error }
): void => {
  // First call is `git config --get user.email`, second is `git log`.
  exec.mockImplementation(
    (
      cmd: string,
      _options: unknown,
      cb: (err: Error | null, stdout?: string, stderr?: string) => void
    ) => {
      if (cmd.includes('config') && cmd.includes('user.email')) {
        if (response.emailError) cb(response.emailError);
        else cb(null, `${response.email ?? ''}\n`, '');
        return;
      }
      if (cmd.includes('log')) {
        if (response.logError) cb(response.logError);
        else cb(null, (response.files ?? []).join('\n'), '');
        return;
      }
      cb(new Error(`unexpected git call: ${cmd}`));
    }
  );
};

describe('registerMyTeamsRoute', () => {
  let root: string;
  let setRoot: (value: string) => void;
  let registerMyTeamsRoute: typeof import('./my_teams').registerMyTeamsRoute;
  let resetMyTeamsCache: typeof import('./my_teams').__resetMyTeamsCacheForTests;
  let resetManifestIndex: typeof import('./manifest_index').__resetManifestIndexCacheForTests;
  let PATH: string;
  let execMock: ExecMock;

  beforeAll(async () => {
    root = await tmpRoot;
    const repoInfo = jest.requireMock('@kbn/repo-info') as { __setRoot: (v: string) => void };
    setRoot = repoInfo.__setRoot;

    const myTeamsMod = await import('./my_teams');
    registerMyTeamsRoute = myTeamsMod.registerMyTeamsRoute;
    resetMyTeamsCache = myTeamsMod.__resetMyTeamsCacheForTests;
    PATH = myTeamsMod.MY_TEAMS_ROUTE_PATH;

    const manifestIndexMod = await import('./manifest_index');
    resetManifestIndex = manifestIndexMod.__resetManifestIndexCacheForTests;

    const child = jest.requireMock('child_process') as { exec: ExecMock };
    execMock = child.exec;
  });

  beforeEach(async () => {
    setRoot(root);
    resetMyTeamsCache();
    resetManifestIndex();
    execMock.mockReset();
    for (const entry of await Fs.readdir(root)) {
      await Fs.rm(Path.join(root, entry), { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    await Fs.rm(root, { recursive: true, force: true });
  });

  const callHandler = async () => {
    const { router, registered } = createFakeRouter();
    registerMyTeamsRoute(
      router as unknown as import('@kbn/core/server').IRouter,
      createFakeLogger()
    );
    expect(router.get).toHaveBeenCalledTimes(1);
    const { handler } = registered[0];
    let body: unknown;
    const res = {
      ok: (arg: { body?: unknown } = {}) => {
        body = arg.body;
        return arg;
      },
    };
    await handler({}, {}, res);
    return { body, config: registered[0].config };
  };

  it('registers the route at the expected internal path with authz disabled and a clear opt-out reason', async () => {
    stubGit(execMock, { email: 'me@example.com', files: [] });
    const { config } = await callHandler();
    expect(PATH).toBe('/internal/observability/dev_tools/my_teams');
    expect((config as { path: string }).path).toBe(PATH);
    expect(
      (config as { security: { authz: { enabled: boolean; reason: string } } }).security.authz
    ).toEqual({
      enabled: false,
      reason: expect.stringMatching(/dev[- ]mode/i),
    });
    expect((config as { options: { access: string } }).options.access).toBe('internal');
  });

  it('returns an empty result with no detectedEmail when git config user.email is unset', async () => {
    stubGit(execMock, { email: '' });
    const { body } = await callHandler();
    expect(body).toMatchObject({
      detectedEmail: undefined,
      suggestedTeams: [],
      matchedFileCount: 0,
      scannedFileCount: 0,
    });
  });

  it('tallies teams by file count, sorted by evidence descending then team ascending', async () => {
    await writeManifest(Path.join(root, 'plugins', 'synthetics'), {
      type: 'plugin',
      id: '@kbn/synthetics',
      owner: ['@elastic/actionable-obs-team'],
      plugin: { id: 'synthetics' },
    });
    await writeManifest(Path.join(root, 'plugins', 'slo'), {
      type: 'plugin',
      id: '@kbn/slo',
      owner: ['@elastic/actionable-obs-team'],
      plugin: { id: 'slo' },
    });
    await writeManifest(Path.join(root, 'plugins', 'spaces'), {
      type: 'plugin',
      id: '@kbn/spaces',
      owner: ['@elastic/kibana-security'],
      plugin: { id: 'spaces' },
    });

    stubGit(execMock, {
      email: 'shahzad@elastic.co',
      files: [
        'plugins/synthetics/public/app.ts',
        'plugins/synthetics/server/route.ts',
        'plugins/synthetics/public/screen.tsx',
        'plugins/slo/server/handler.ts',
        'plugins/spaces/public/x.ts',
        'docs/readme.md', // outside any plugin – counts toward scannedFileCount but not matched
      ],
    });

    const { body } = await callHandler();
    expect(body).toEqual({
      detectedEmail: 'shahzad@elastic.co',
      suggestedTeams: [
        { team: '@elastic/actionable-obs-team', evidenceCount: 4 },
        { team: '@elastic/kibana-security', evidenceCount: 1 },
      ],
      matchedFileCount: 5,
      scannedFileCount: 6,
      detectedAt: expect.any(String),
    });
  });

  it('credits every team for a plugin with multiple owners', async () => {
    await writeManifest(Path.join(root, 'plugins', 'multi'), {
      type: 'plugin',
      id: '@kbn/multi',
      owner: ['@elastic/team-a', '@elastic/team-b'],
      plugin: { id: 'multi' },
    });
    stubGit(execMock, {
      email: 'm@example.com',
      files: ['plugins/multi/public/a.ts', 'plugins/multi/public/b.ts'],
    });

    const { body } = await callHandler();
    expect(
      (body as { suggestedTeams: Array<{ team: string; evidenceCount: number }> }).suggestedTeams
    ).toEqual([
      { team: '@elastic/team-a', evidenceCount: 2 },
      { team: '@elastic/team-b', evidenceCount: 2 },
    ]);
  });

  it('treats a git log failure as "no signal" rather than throwing', async () => {
    await writeManifest(Path.join(root, 'plugins', 'a'), {
      type: 'plugin',
      id: '@kbn/a',
      owner: ['@elastic/a'],
      plugin: { id: 'a' },
    });
    stubGit(execMock, { email: 'a@b.c', logError: new Error('shallow clone') });

    const { body } = await callHandler();
    expect(body).toMatchObject({
      detectedEmail: 'a@b.c',
      suggestedTeams: [],
      matchedFileCount: 0,
      scannedFileCount: 0,
    });
  });

  it('caches the response across handler invocations (one git scan per server lifecycle)', async () => {
    await writeManifest(Path.join(root, 'plugins', 'a'), {
      type: 'plugin',
      id: '@kbn/a',
      owner: ['@elastic/a'],
      plugin: { id: 'a' },
    });
    stubGit(execMock, { email: 'a@b.c', files: ['plugins/a/x.ts'] });

    await callHandler();
    await callHandler();
    await callHandler();

    // 1 email call + 1 log call total — subsequent handler invocations hit
    // the cache and don't shell out again.
    expect(execMock).toHaveBeenCalledTimes(2);
  });
});
