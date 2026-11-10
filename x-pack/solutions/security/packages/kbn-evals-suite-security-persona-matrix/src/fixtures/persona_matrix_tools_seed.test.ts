/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { CHRYSALIS_PARITY_AGENT } from './chrysalis_parity_agent';
import { PARITY_WORKFLOWS } from './parity_workflows';

const mockSinkClose = jest.fn(async () => {});

jest.mock('./stub_sink', () => ({
  SINK_ORIGIN: 'http://127.0.0.1:38465',
  startStubSink: jest.fn(async () => ({
    origin: 'http://127.0.0.1:38465',
    owned: true,
    close: mockSinkClose,
  })),
}));

const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const AGENT_TOOLS_PATH = '/api/agent_builder/agents/elastic-ai-agent';
const PARITY_AGENT_PATH = '/api/agent_builder/agents/chrysalis-hunting-agent';

interface Req {
  method: string;
  path: string;
  body?: Record<string, unknown> & { id?: string; configuration?: Record<string, unknown> };
  query?: Record<string, unknown>;
}

interface MockClient {
  request: jest.Mock;
  resolveUrl: jest.Mock;
}

const STUB_PATH = '/api/actions/connector/d7306385-cbe6-4541-9726-49afdff59ba5';

const asKbn = (client: MockClient) => client as unknown as KbnClient;

const agentWith = (
  tools?: Array<Record<string, unknown>>,
  accessControl: Record<string, unknown> = { access_mode: 'public' }
) => ({
  name: 'Elastic AI Agent',
  description: 'desc',
  access_control: accessControl,
  configuration: { tools },
});

interface MockCase {
  id: string;
  tags: string[];
  created_at: string;
}

const BEFORE_WINDOW = '2000-01-01T00:00:00.000Z';
const IN_WINDOW = '2999-01-01T00:00:00.000Z';

interface ClientOptions {
  agent?: Record<string, unknown>;
  postBehavior?: 'ok' | 'conflict';
  skills?: string[];
  /** Run-tagged cases created after the seed (inside the cleanup window). */
  caseIds?: string[];
  /** Cases with explicit tags and creation time, for the window and tag filters. */
  cases?: MockCase[];
  /** Overrides what GET on an existing workflow returns as `yaml` (default: the seeded yaml). */
  existingWorkflowYaml?: string;
  baseUrl?: string;
  /** What GET on the stub connector id returns after a 409. `'error'` makes the GET throw. */
  existingConnector?: { connector_type_id: string; config?: { url?: string } } | 'error';
  /** Makes the stub connector POST fail with this status (not "already exists"). */
  stubCreateStatus?: number;
}

const alreadyExists = (status: number) =>
  Object.assign(new Error('Conflict: already exists'), { status });

const createClient = ({
  agent = agentWith(),
  postBehavior = 'ok',
  skills = [...CHRYSALIS_PARITY_AGENT.skillIds],
  caseIds = [],
  cases = [],
  existingWorkflowYaml,
  baseUrl = 'http://elastic:changeme@localhost:5620',
  existingConnector = { connector_type_id: '.http', config: { url: 'http://127.0.0.1:38465' } },
  stubCreateStatus,
}: ClientOptions = {}): MockClient => ({
  // Real KbnClient keeps `user:pass@` in resolveUrl().
  resolveUrl: jest.fn((relative: string) => `${baseUrl}${relative}`),
  request: jest.fn(async ({ method, path, query }: Req) => {
    if (method === 'GET' && path === AGENT_TOOLS_PATH) {
      // Real KbnClient.request envelope: the payload lives under `data`.
      return { data: agent };
    }
    if (method === 'GET' && path === '/api/agent_builder/skills') {
      return { data: { results: skills.map((id) => ({ id })) } };
    }
    if (method === 'GET' && path === STUB_PATH) {
      if (existingConnector === 'error') throw Object.assign(new Error('boom'), { status: 500 });
      return { data: existingConnector };
    }
    if (method === 'GET' && path.startsWith('/api/workflows/workflow/')) {
      const seeded = PARITY_WORKFLOWS.find((w) => path.endsWith(`/${w.id}`));
      return { data: { yaml: existingWorkflowYaml ?? seeded?.yaml } };
    }
    if (method === 'GET' && path === '/api/cases/_find') {
      const perPage = Number(query?.perPage ?? 20);
      const page = Number(query?.page ?? 1);
      // Like the real route: `tags` and `from` (created_at >= from) narrow the result.
      const from = typeof query?.from === 'string' ? Date.parse(query.from) : undefined;
      const matching = [
        ...caseIds.map((id) => ({ id, tags: ['persona-matrix-parity'], created_at: IN_WINDOW })),
        ...cases,
      ].filter(
        (found) =>
          (query?.tags === undefined || found.tags.includes(String(query.tags))) &&
          (from === undefined || Date.parse(found.created_at) >= from)
      );
      return {
        data: {
          cases: matching.slice((page - 1) * perPage, page * perPage).map(({ id }) => ({ id })),
          total: matching.length,
        },
      };
    }
    if (method === 'POST') {
      if (path === STUB_PATH && stubCreateStatus !== undefined) {
        throw Object.assign(new Error('Bad Request: url not in allowedHosts'), {
          status: stubCreateStatus,
        });
      }
      if (postBehavior === 'conflict') {
        // Agent create answers a duplicate id with 400, tools/workflows with 409.
        throw alreadyExists(path === '/api/agent_builder/agents' ? 400 : 409);
      }
      return { data: {} };
    }
    return { data: {} };
  }),
});

const calls = (client: MockClient): Req[] => client.request.mock.calls.map(([req]) => req);
const agentPuts = (client: MockClient) =>
  calls(client).filter((req) => req.method === 'PUT' && req.path === AGENT_TOOLS_PATH);
const posts = (client: MockClient, path: string) =>
  calls(client).filter((req) => req.method === 'POST' && req.path === path);

/** `seedProfile` is resolved from SEED_PROFILE at import time, so set it first. */
const load = async (seed: 'minimal' | 'parity' = 'minimal') => {
  process.env.SEED_PROFILE = seed;
  return import('./persona_matrix_tools_seed');
};

describe('persona_matrix_tools_seed', () => {
  const originalSeedProfile = process.env.SEED_PROFILE;

  beforeEach(() => {
    // Created ids live in module-level state; reset so each test starts clean.
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalSeedProfile === undefined) {
      delete process.env.SEED_PROFILE;
    } else {
      process.env.SEED_PROFILE = originalSeedProfile;
    }
  });

  describe('default profile, minimal seed', () => {
    it('appends PERSONA_MATRIX_TOOL_IDS as a new selection entry alongside preserved entries', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_TOOL_IDS } = await load();
      const client = createClient({ agent: agentWith([{ tool_ids: ['builtin_search'] }]) });

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0].body?.configuration?.tools).toEqual([
        { tool_ids: ['builtin_search'] },
        { tool_ids: [...PERSONA_MATRIX_TOOL_IDS] },
      ]);
    });

    it('seeds no workflows, parity tools or parity agent', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_PARITY_TOOL_IDS } = await load();
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(posts(client, '/api/workflows/workflow')).toHaveLength(0);
      expect(posts(client, '/api/agent_builder/agents')).toHaveLength(0);
      const toolIds = posts(client, '/api/agent_builder/tools').map((req) => req.body?.id);
      for (const id of PERSONA_MATRIX_PARITY_TOOL_IDS) {
        expect(toolIds).not.toContain(id);
      }
    });

    it('is idempotent: issues no PUT when the agent already has all tool ids', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_TOOL_IDS } = await load();
      const client = createClient({
        agent: agentWith([{ tool_ids: [...PERSONA_MATRIX_TOOL_IDS] }]),
      });

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(agentPuts(client)).toHaveLength(0);
    });

    it('preserves existing selection entries verbatim and only appends the new one', async () => {
      const { seedPersonaMatrixTools } = await load();
      const existing = [
        { type: 'mcp', mcp_server_id: 'x', tool_ids: ['other'] },
        { tool_ids: ['virustotal_lookup'] },
      ];
      const client = createClient({ agent: agentWith(existing) });

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0].body?.configuration?.tools).toEqual([
        ...existing,
        { tool_ids: ['on_call_lookup'] },
      ]);
    });

    it('forwards exactly { access_mode } in the PUT access_control even when the GET returns entries (shape since #290353)', async () => {
      const { seedPersonaMatrixTools } = await load();
      const client = createClient({ agent: agentWith([], { access_mode: 'public', entries: [] }) });

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0].body?.access_control).toEqual({ access_mode: 'public' });
    });

    it("preserves a 'private' access_mode from the GET in the PUT body", async () => {
      const { seedPersonaMatrixTools } = await load();
      const client = createClient({
        agent: agentWith([], { access_mode: 'private', entries: [{ type: 'user', id: 'u_1' }] }),
      });

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0].body?.access_control).toEqual({ access_mode: 'private' });
    });
  });

  describe('stub connector', () => {
    it('creates an .http stub connector with the prompt connector id pointing at the local sink, without credentials', async () => {
      const { seedPersonaMatrixTools, STUB_CONNECTOR_ID } = await load();
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(STUB_CONNECTOR_ID).toBe('d7306385-cbe6-4541-9726-49afdff59ba5');
      const created = posts(client, STUB_PATH);
      expect(created).toHaveLength(1);
      // Exact body: Kibana fills in a default `authType` when it is omitted, and
      // the `.http` config validation then rejects it with a 400 because
      // `hasAuth` is false. `authType: null` is the only accepted no-auth shape.
      expect(created[0].body).toEqual({
        name: 'persona-matrix local sink (stub)',
        connector_type_id: '.http',
        config: { url: 'http://127.0.0.1:38465', hasAuth: false, authType: null },
        secrets: {},
      });
    });

    it('is not verified before the seed runs, and verified after creating the connector', async () => {
      const mod = await load();
      expect(mod.isStubConnectorVerified()).toBe(false);
      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(createClient()), log });
      expect(mod.isStubConnectorVerified()).toBe(true);
    });

    it('verifies a pre-existing .http connector whose url is the sink origin', async () => {
      const mod = await load();
      const client = createClient({
        postBehavior: 'conflict',
        existingConnector: {
          connector_type_id: '.http',
          config: { url: 'http://127.0.0.1:38465/some/path' },
        },
      });

      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(calls(client)).toContainEqual(
        expect.objectContaining({ method: 'GET', path: STUB_PATH })
      );
      expect(mod.isStubConnectorVerified()).toBe(true);
    });

    it.each([
      ['a .slack connector', { connector_type_id: '.slack', config: {} }],
      [
        'an .http connector pointing at another host',
        { connector_type_id: '.http', config: { url: 'https://hooks.example.com/x' } },
      ],
      ['an .http connector without a url', { connector_type_id: '.http', config: {} }],
      [
        'an .http connector with an unparseable url',
        { connector_type_id: '.http', config: { url: 'not a url' } },
      ],
      ['a connector that cannot be read', 'error' as const],
    ])('does not trust %s already sitting at the stub id', async (_name, existingConnector) => {
      const mod = await load();
      const client = createClient({ postBehavior: 'conflict', existingConnector });

      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(mod.isStubConnectorVerified()).toBe(false);
      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('not trusting'));
    });

    it.each([400, 403, 500])(
      'keeps seeding when the stub connector create fails with %s, leaving it unverified',
      async (status) => {
        const mod = await load();
        const client = createClient({ stubCreateStatus: status });

        await expect(
          mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log })
        ).resolves.toBeUndefined();

        expect(mod.isStubConnectorVerified()).toBe(false);
        expect(log.warning).toHaveBeenCalledWith(
          expect.stringContaining('could not create stub connector')
        );
        expect(posts(client, '/api/agent_builder/tools').length).toBeGreaterThan(0);
        expect(agentPuts(client)).toHaveLength(1);
      }
    );

    it('never deletes the stub connector on cleanup, whether created or pre-existing', async () => {
      for (const postBehavior of ['ok', 'conflict'] as const) {
        const mod = await load();
        const client = createClient({ postBehavior });

        await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log });
        await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

        expect(
          calls(client).filter((req) => req.path === STUB_PATH && req.method === 'DELETE')
        ).toHaveLength(0);
        jest.resetModules();
      }
    });
  });

  describe('default profile, parity seed', () => {
    it('attaches PERSONA_MATRIX_TOOL_IDS plus PERSONA_MATRIX_PARITY_TOOL_IDS to the default agent', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_TOOL_IDS, PERSONA_MATRIX_PARITY_TOOL_IDS } =
        await load('parity');
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0].body?.configuration?.tools).toEqual([
        { tool_ids: [...PERSONA_MATRIX_TOOL_IDS, ...PERSONA_MATRIX_PARITY_TOOL_IDS] },
      ]);
      expect(posts(client, '/api/agent_builder/agents')).toHaveLength(0);
    });

    it('creates every workflow before any workflow tool that references it', async () => {
      const { seedPersonaMatrixTools } = await load('parity');
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const order = calls(client)
        .filter((req) => req.method === 'POST')
        .map((req) => `${req.path}#${req.body?.id}`);
      const workflowIds = ['vt-hash-lookup', 'create-case', 'create-channel'];
      for (const workflowId of workflowIds) {
        expect(order).toContain(`/api/workflows/workflow#${workflowId}`);
      }
      const lastWorkflow = Math.max(
        ...workflowIds.map((id) => order.indexOf(`/api/workflows/workflow#${id}`))
      );
      const firstWorkflowTool = order.indexOf('/api/agent_builder/tools#vt.hash.lookup');
      expect(firstWorkflowTool).toBeGreaterThan(lastWorkflow);
    });

    it('wires each workflow tool to a seeded workflow id', async () => {
      const { seedPersonaMatrixTools } = await load('parity');
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const seededWorkflowIds = PARITY_WORKFLOWS.map((w) => w.id);
      const workflowTools = posts(client, '/api/agent_builder/tools').filter(
        (req) => req.body?.type === 'workflow'
      );
      expect(workflowTools.map((req) => req.body?.id).sort()).toEqual([
        'create.case',
        'create.channel',
        'vt.hash.lookup',
      ]);
      for (const req of workflowTools) {
        expect(seededWorkflowIds).toContain(req.body?.configuration?.workflow_id);
      }
    });

    it('check.on.call.schedule KEEPs only fields present on the seeded on-call doc', async () => {
      const { seedPersonaMatrixTools } = await load('parity');
      const { PARITY_DOCS } = await import('./chrysalis_parity_docs');
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const body = posts(client, '/api/agent_builder/tools').find(
        (req) => req.body?.id === 'check.on.call.schedule'
      )?.body;
      const query = String(body?.configuration?.query);
      const [, index] = /^FROM (\S+)/.exec(query) ?? [];
      const keep =
        /\| KEEP ([^|]+)\|/
          .exec(query)?.[1]
          .split(',')
          .map((f) => f.trim()) ?? [];
      const onCallDoc = PARITY_DOCS.find((d) => d.index === index)?.doc;
      expect(onCallDoc).toBeDefined();
      expect(keep.length).toBeGreaterThan(0);

      const getDeep = (obj: unknown, path: string): unknown =>
        path.split('.').reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
      for (const field of keep) {
        expect({ field, value: getDeep(onCallDoc, field) }).toEqual({
          field,
          value: expect.anything(),
        });
      }
    });
  });

  describe("profile: 'chrysalis-parity'", () => {
    it('creates the parity agent with the five parity tools and does not touch the default agent', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_PARITY_TOOL_IDS } = await load('parity');
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, profile: 'chrysalis-parity' });

      expect(agentPuts(client)).toHaveLength(0);
      const agentPosts = posts(client, '/api/agent_builder/agents');
      expect(agentPosts).toHaveLength(1);
      const configuration = agentPosts[0].body?.configuration as {
        tools: Array<{ tool_ids: string[] }>;
      };
      expect(configuration.tools).toEqual([
        { tool_ids: expect.arrayContaining([...PERSONA_MATRIX_PARITY_TOOL_IDS]) },
      ]);
      expect(configuration.tools[0].tool_ids).toHaveLength(PERSONA_MATRIX_PARITY_TOOL_IDS.length);
    });

    it('seeds parity workflows and tools even under the minimal seed profile', async () => {
      const { seedPersonaMatrixTools } = await load('minimal');
      const client = createClient();

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, profile: 'chrysalis-parity' });

      expect(posts(client, '/api/workflows/workflow')).toHaveLength(3);
      expect(posts(client, '/api/agent_builder/agents')).toHaveLength(1);
    });

    it('drops skill ids missing from this install and warns about them', async () => {
      const { seedPersonaMatrixTools } = await load('parity');
      const client = createClient({ skills: ['threat-hunting', 'alert-analysis', 'not-wanted'] });

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, profile: 'chrysalis-parity' });

      const configuration = posts(client, '/api/agent_builder/agents')[0].body?.configuration as {
        skill_ids: string[];
      };
      expect(configuration.skill_ids.sort()).toEqual(['alert-analysis', 'threat-hunting']);
      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('dropping'));
    });

    it('rethrows a 400 on agent create that is not a duplicate', async () => {
      const { seedPersonaMatrixTools } = await load('parity');
      const client = createClient();
      const base = client.request.getMockImplementation();
      client.request.mockImplementation(async (req: Req) => {
        if (req.method === 'POST' && req.path === '/api/agent_builder/agents') {
          throw Object.assign(new Error('Bad Request: unknown skill'), { status: 400 });
        }
        return base?.(req);
      });

      await expect(
        seedPersonaMatrixTools({ kbnClient: asKbn(client), log, profile: 'chrysalis-parity' })
      ).rejects.toThrow('unknown skill');
    });
  });

  describe('pre-existing workflow with the same id', () => {
    it('refuses to bind parity tools to a workflow whose definition differs from the seed', async () => {
      const mod = await load('parity');
      const client = createClient({
        postBehavior: 'conflict',
        existingWorkflowYaml: 'name: create-channel\nsteps:\n  - type: slack\n',
      });

      await expect(
        mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log, profile: 'chrysalis-parity' })
      ).rejects.toThrow(/differs from the seeded one/);
      expect(posts(client, '/api/agent_builder/agents')).toHaveLength(0);
    });

    it('reuses a pre-existing workflow whose yaml equals the seed', async () => {
      const mod = await load('parity');
      const client = createClient({ postBehavior: 'conflict' });

      await expect(
        mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log, profile: 'chrysalis-parity' })
      ).resolves.toBeUndefined();
    });
  });

  describe('cleanupPersonaMatrixTools', () => {
    it('never closes the sink: other workers share it and it dies with the process', async () => {
      mockSinkClose.mockClear();
      const mod = await load();
      const client = createClient();
      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log });
      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });
      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });
      expect(mockSinkClose).not.toHaveBeenCalled();
    });

    it('deletes only the tools, workflows and agent created in this run, plus tagged cases', async () => {
      const mod = await load('parity');
      const client = createClient({ caseIds: ['case-1', 'case-2'] });
      await mod.seedPersonaMatrixTools({
        kbnClient: asKbn(client),
        log,
        profile: 'chrysalis-parity',
      });

      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const deletes = calls(client)
        .filter((req) => req.method === 'DELETE')
        .map((req) => req.path);
      const toolIds = [...mod.PERSONA_MATRIX_TOOL_IDS, ...mod.PERSONA_MATRIX_PARITY_TOOL_IDS];
      const expected = [
        ...toolIds.map((id) => `/api/agent_builder/tools/${encodeURIComponent(id)}?force=true`),
        ...['vt-hash-lookup', 'create-case', 'create-channel'].map(
          (id) => `/api/workflows/workflow/${id}?force=true&acknowledgeAclLoss=true`
        ),
        PARITY_AGENT_PATH,
        `/api/cases?ids=${encodeURIComponent(JSON.stringify(['case-1', 'case-2']))}`,
      ];
      expect(deletes.sort()).toEqual(expected.sort());
      expect(calls(client)).toContainEqual(
        expect.objectContaining({
          method: 'GET',
          path: '/api/cases/_find',
          query: expect.objectContaining({ tags: 'persona-matrix-parity', perPage: 100, page: 1 }),
        })
      );
      expect(log.warning).not.toHaveBeenCalled();
    });

    it('keeps pre-existing tools, workflows and agent (create answered "already exists")', async () => {
      const mod = await load('parity');
      const client = createClient({ postBehavior: 'conflict' });

      await mod.seedPersonaMatrixTools({
        kbnClient: asKbn(client),
        log,
        profile: 'chrysalis-parity',
      });
      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(calls(client).filter((req) => req.method === 'DELETE')).toHaveLength(0);
    });

    it('skips case cleanup entirely when this run did not create the create-case workflow', async () => {
      const mod = await load('parity');
      const client = createClient({ postBehavior: 'conflict', caseIds: ['someone-elses'] });
      await mod.seedPersonaMatrixTools({
        kbnClient: asKbn(client),
        log,
        profile: 'chrysalis-parity',
      });

      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(calls(client).filter((req) => req.path.startsWith('/api/cases'))).toHaveLength(0);
    });

    it('skips case cleanup on a minimal run that never seeds workflows', async () => {
      const mod = await load('minimal');
      const client = createClient({ caseIds: ['x'] });
      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log });

      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(calls(client).filter((req) => req.path.startsWith('/api/cases'))).toHaveLength(0);
    });

    it('pages through every tagged case and deletes them in chunks, only those opened since the workflow was created', async () => {
      const mod = await load('parity');
      const ids = Array.from({ length: 250 }, (_, i) => `case-${i}`);
      const client = createClient({ caseIds: ids });
      await mod.seedPersonaMatrixTools({
        kbnClient: asKbn(client),
        log,
        profile: 'chrysalis-parity',
      });

      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const finds = calls(client).filter((req) => req.path === '/api/cases/_find');
      expect(finds.map((req) => req.query?.page)).toEqual([1, 2, 3]);
      expect(finds[0].query?.from).toEqual(expect.any(String));
      const deleted = calls(client)
        .filter((req) => req.method === 'DELETE' && req.path.startsWith('/api/cases?'))
        .flatMap((req) => JSON.parse(decodeURIComponent(req.path.split('ids=')[1])));
      expect(deleted).toEqual(ids);
    });

    it('deletes only run-tagged cases created inside the window, not older or other-tagged ones', async () => {
      const mod = await load('parity');
      const client = createClient({
        caseIds: ['run-1', 'run-2'],
        cases: [
          { id: 'older-run', tags: ['persona-matrix-parity'], created_at: BEFORE_WINDOW },
          { id: 'chrysalis-case', tags: ['chrysalis'], created_at: IN_WINDOW },
        ],
      });
      await mod.seedPersonaMatrixTools({
        kbnClient: asKbn(client),
        log,
        profile: 'chrysalis-parity',
      });

      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const deleted = calls(client)
        .filter((req) => req.method === 'DELETE' && req.path.startsWith('/api/cases?'))
        .flatMap((req) => JSON.parse(decodeURIComponent(req.path.split('ids=')[1])));
      expect(deleted).toEqual(['run-1', 'run-2']);
    });

    it('issues no case delete when no tagged cases exist', async () => {
      const mod = await load('parity');
      const client = createClient();
      await mod.seedPersonaMatrixTools({
        kbnClient: asKbn(client),
        log,
        profile: 'chrysalis-parity',
      });

      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      expect(
        calls(client).filter((req) => req.method === 'DELETE' && req.path.startsWith('/api/cases'))
      ).toHaveLength(0);
    });
  });
});
