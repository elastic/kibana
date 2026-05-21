/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as Fs } from 'fs';
import Os from 'os';
import Path from 'path';

const tmpRoot = Fs.mkdtemp(Path.join(Os.tmpdir(), 'plugin-owners-test-'));

jest.mock('@kbn/repo-info', () => {
  // Returning a getter so the mocked REPO_ROOT can be set after the temp dir
  // resolves. Tests await `tmpRoot` in beforeAll before using it.
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
  config: Parameters<RouterStub['get']>[0];
  handler: Parameters<RouterStub['get']>[1];
}

interface RouterStub {
  get: jest.Mock;
}

const createFakeRouter = (): { router: RouterStub; registered: RegisteredRoute[] } => {
  const registered: RegisteredRoute[] = [];
  const router: RouterStub = {
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

interface CapturedResponse {
  body?: unknown;
}

const fakeResponse = () => {
  const captured: CapturedResponse = {};
  const res = {
    ok: jest.fn((arg: { body?: unknown } = {}) => {
      captured.body = arg.body;
      return captured;
    }),
  };
  return { res, captured };
};

const writeManifest = async (dir: string, content: object | string): Promise<void> => {
  await Fs.mkdir(dir, { recursive: true });
  const raw = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  await Fs.writeFile(Path.join(dir, 'kibana.jsonc'), raw, 'utf8');
};

describe('registerPluginOwnersRoute', () => {
  let root: string;
  let setRoot: (value: string) => void;
  let registerPluginOwnersRoute: typeof import('./plugin_owners').registerPluginOwnersRoute;
  let resetCache: typeof import('./plugin_owners').__resetPluginOwnersCacheForTests;
  let PATH: string;

  beforeAll(async () => {
    root = await tmpRoot;
    const repoInfo = jest.requireMock('@kbn/repo-info') as { __setRoot: (v: string) => void };
    setRoot = repoInfo.__setRoot;

    const mod = await import('./plugin_owners');
    registerPluginOwnersRoute = mod.registerPluginOwnersRoute;
    resetCache = mod.__resetPluginOwnersCacheForTests;
    PATH = mod.PLUGIN_OWNERS_ROUTE_PATH;
  });

  // `resetCache` already clears the shared manifest index, so no additional
  // wiring is needed here.

  beforeEach(async () => {
    setRoot(root);
    resetCache();
    // Clean the temp root between tests so each test sees only its own manifests.
    for (const entry of await Fs.readdir(root)) {
      await Fs.rm(Path.join(root, entry), { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    await Fs.rm(root, { recursive: true, force: true });
  });

  const callHandler = async () => {
    const { router, registered } = createFakeRouter();
    registerPluginOwnersRoute(
      router as unknown as import('@kbn/core/server').IRouter,
      createFakeLogger()
    );
    expect(router.get).toHaveBeenCalledTimes(1);
    const { handler } = registered[0];
    const { res, captured } = fakeResponse();
    await handler(
      {} as unknown as Parameters<typeof handler>[0],
      {} as unknown as Parameters<typeof handler>[1],
      res as unknown as Parameters<typeof handler>[2]
    );
    return { res, body: captured.body, config: registered[0].config };
  };

  it('registers the route on the well-known internal path with authz disabled and a documented reason', async () => {
    const { config } = await callHandler();
    expect(PATH).toBe('/internal/observability/dev_tools/plugin_owners');
    expect((config as { path: string }).path).toBe(PATH);
    expect(
      (config as { security: { authz: { enabled: boolean; reason: string } } }).security.authz
    ).toEqual({
      enabled: false,
      reason: expect.stringMatching(/dev[- ]mode/i),
    });
    expect((config as { options: { access: string } }).options.access).toBe('internal');
  });

  it('builds the owners map from kibana.jsonc files under REPO_ROOT', async () => {
    await writeManifest(Path.join(root, 'plugins', 'synthetics'), {
      type: 'plugin',
      id: '@kbn/synthetics-plugin',
      owner: ['@elastic/actionable-obs-team'],
      plugin: { id: 'synthetics', browser: true, server: true },
    });
    await writeManifest(Path.join(root, 'plugins', 'slo'), {
      type: 'plugin',
      id: '@kbn/slo-plugin',
      owner: ['@elastic/actionable-obs-team'],
      plugin: { id: 'slo', browser: true, server: true },
    });
    await writeManifest(Path.join(root, 'plugins', 'spaces'), {
      type: 'plugin',
      id: '@kbn/spaces-plugin',
      owner: ['@elastic/kibana-security'],
      plugin: { id: 'spaces', browser: true, server: true },
    });

    const { body } = await callHandler();
    expect(body).toMatchObject({
      owners: {
        synthetics: ['@elastic/actionable-obs-team'],
        slo: ['@elastic/actionable-obs-team'],
        spaces: ['@elastic/kibana-security'],
      },
      knownTeams: ['@elastic/actionable-obs-team', '@elastic/kibana-security'],
    });
  });

  it('skips non-plugin packages and plugins without an owner', async () => {
    await writeManifest(Path.join(root, 'plugins', 'real_plugin'), {
      type: 'plugin',
      id: '@kbn/real-plugin',
      owner: ['@elastic/foo'],
      plugin: { id: 'realPlugin', browser: true, server: true },
    });
    await writeManifest(Path.join(root, 'packages', 'shared'), {
      type: 'shared-browser',
      id: '@kbn/shared',
      owner: ['@elastic/foo'],
    });
    await writeManifest(Path.join(root, 'plugins', 'no_owner'), {
      type: 'plugin',
      id: '@kbn/no-owner',
      owner: [],
      plugin: { id: 'noOwner', browser: true, server: true },
    });

    const { body } = await callHandler();
    expect((body as { owners: Record<string, string[]> }).owners).toEqual({
      realPlugin: ['@elastic/foo'],
    });
  });

  it('parses JSONC files with // line comments and /* block comments */', async () => {
    const jsonc = `{
  // single-line comment
  "type": "plugin",
  /* block
     comment */
  "id": "@kbn/with-comments",
  "owner": ["@elastic/comments-team"],
  "plugin": { "id": "withComments", "browser": true, "server": false }
}`;
    await writeManifest(Path.join(root, 'plugins', 'with_comments'), jsonc);

    const { body } = await callHandler();
    expect((body as { owners: Record<string, string[]> }).owners.withComments).toEqual([
      '@elastic/comments-team',
    ]);
  });

  it('skips excluded directory names (node_modules, target, build, ...) during the scan', async () => {
    await writeManifest(Path.join(root, 'good', 'visible'), {
      type: 'plugin',
      id: '@kbn/visible',
      owner: ['@elastic/visible'],
      plugin: { id: 'visible', browser: true, server: true },
    });
    await writeManifest(Path.join(root, 'node_modules', 'sneaky'), {
      type: 'plugin',
      id: '@kbn/sneaky',
      owner: ['@elastic/sneaky'],
      plugin: { id: 'sneaky', browser: true, server: true },
    });
    await writeManifest(Path.join(root, 'target', 'hidden'), {
      type: 'plugin',
      id: '@kbn/hidden',
      owner: ['@elastic/hidden'],
      plugin: { id: 'hidden', browser: true, server: true },
    });

    const { body } = await callHandler();
    const owners = (body as { owners: Record<string, string[]> }).owners;
    expect(owners.visible).toEqual(['@elastic/visible']);
    expect(owners.sneaky).toBeUndefined();
    expect(owners.hidden).toBeUndefined();
  });

  it('caches the map across handler invocations (single scan per server lifecycle)', async () => {
    await writeManifest(Path.join(root, 'plugins', 'a'), {
      type: 'plugin',
      id: '@kbn/a',
      owner: ['@elastic/a'],
      plugin: { id: 'a', browser: true, server: true },
    });

    const { body: first } = await callHandler();
    const firstBuiltAt = (first as { builtAt: string }).builtAt;

    // Add a new manifest after the first call. Because the response is cached
    // for the lifetime of the server process, the second call must NOT pick
    // up the new plugin (otherwise dev sessions would suffer flaky scans on
    // every refresh).
    await writeManifest(Path.join(root, 'plugins', 'b'), {
      type: 'plugin',
      id: '@kbn/b',
      owner: ['@elastic/b'],
      plugin: { id: 'b', browser: true, server: true },
    });

    const { body: second } = await callHandler();
    expect((second as { owners: Record<string, string[]> }).owners).toEqual({
      a: ['@elastic/a'],
    });
    expect((second as { builtAt: string }).builtAt).toBe(firstBuiltAt);
  });
});
