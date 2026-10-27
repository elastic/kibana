/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';

const log = { info: jest.fn(), warning: jest.fn() } as unknown as ToolingLog;

const AGENT_TOOLS_PATH = '/api/agent_builder/agents/elastic-ai-agent';

interface MockClient {
  request: jest.Mock;
}

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

const createClient = (
  agent: Record<string, unknown> = agentWith(),
  postBehavior: 'ok' | 'conflict' = 'ok'
): MockClient => ({
  request: jest.fn(async ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === AGENT_TOOLS_PATH) {
      // Real KbnClient.request envelope: the payload lives under `data`.
      return { data: agent };
    }
    if (method === 'POST' && path === '/api/agent_builder/tools') {
      if (postBehavior === 'conflict') {
        throw Object.assign(new Error('Conflict: already exists'), { status: 409 });
      }
      return { data: {} };
    }
    return {};
  }),
});

const agentPuts = (client: MockClient) =>
  client.request.mock.calls.filter(
    ([req]) => req.method === 'PUT' && req.path === AGENT_TOOLS_PATH
  );

describe('persona_matrix_tools_seed', () => {
  beforeEach(() => {
    // The module tracks created tool ids in module-level state; reset so each
    // test seeds from a clean slate.
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('seedPersonaMatrixTools({ parity: false })', () => {
    it('appends PERSONA_MATRIX_TOOL_IDS as a new selection entry alongside preserved entries', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_TOOL_IDS } = await import(
        './persona_matrix_tools_seed'
      );
      const client = createClient(agentWith([{ tool_ids: ['builtin_search'] }]));

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: false });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0][0].body.configuration.tools).toEqual([
        { tool_ids: ['builtin_search'] },
        { tool_ids: [...PERSONA_MATRIX_TOOL_IDS] },
      ]);
    });

    it('is idempotent: issues no PUT when the agent already has all tool ids', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_TOOL_IDS } = await import(
        './persona_matrix_tools_seed'
      );
      const client = createClient(agentWith([{ tool_ids: [...PERSONA_MATRIX_TOOL_IDS] }]));

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: false });

      expect(agentPuts(client)).toHaveLength(0);
    });

    it('preserves existing selection entries verbatim and only appends the new one', async () => {
      const { seedPersonaMatrixTools } = await import('./persona_matrix_tools_seed');
      const existing = [
        { type: 'mcp', mcp_server_id: 'x', tool_ids: ['other'] },
        { tool_ids: ['virustotal_lookup'] },
      ];
      const client = createClient(agentWith(existing));

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: false });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0][0].body.configuration.tools).toEqual([
        ...existing,
        { tool_ids: ['on_call_lookup'] },
      ]);
    });
    it('forwards exactly { access_mode } in the PUT access_control even when the GET returns entries (shape since #290353)', async () => {
      const { seedPersonaMatrixTools } = await import('./persona_matrix_tools_seed');
      const client = createClient(agentWith([], { access_mode: 'public', entries: [] }));

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: false });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0][0].body.access_control).toEqual({ access_mode: 'public' });
    });

    it("preserves a 'private' access_mode from the GET in the PUT body", async () => {
      const { seedPersonaMatrixTools } = await import('./persona_matrix_tools_seed');
      const client = createClient(
        agentWith([], { access_mode: 'private', entries: [{ type: 'user', id: 'u_1' }] })
      );

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: false });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0][0].body.access_control).toEqual({ access_mode: 'private' });
    });
  });

  describe('seedPersonaMatrixTools({ parity: true })', () => {
    it('attaches PERSONA_MATRIX_TOOL_IDS plus PERSONA_MATRIX_PARITY_TOOL_IDS', async () => {
      const { seedPersonaMatrixTools, PERSONA_MATRIX_TOOL_IDS, PERSONA_MATRIX_PARITY_TOOL_IDS } =
        await import('./persona_matrix_tools_seed');
      const client = createClient(agentWith());

      await seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: true });

      const puts = agentPuts(client);
      expect(puts).toHaveLength(1);
      expect(puts[0][0].body.configuration.tools).toEqual([
        { tool_ids: [...PERSONA_MATRIX_TOOL_IDS, ...PERSONA_MATRIX_PARITY_TOOL_IDS] },
      ]);
    });
  });

  describe('cleanupPersonaMatrixTools', () => {
    it('force-deletes only tools created in this run', async () => {
      const mod = await import('./persona_matrix_tools_seed');
      const client = createClient();
      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: true });

      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const expectedIds = [...mod.PERSONA_MATRIX_TOOL_IDS, ...mod.PERSONA_MATRIX_PARITY_TOOL_IDS];
      const postCleanupDeletes = client.request.mock.calls
        .filter(([req]) => req.method === 'DELETE')
        .map(([req]) => req);
      expect(postCleanupDeletes).toHaveLength(expectedIds.length);
      for (const id of expectedIds) {
        expect(postCleanupDeletes).toContainEqual(
          expect.objectContaining({
            method: 'DELETE',
            path: `/api/agent_builder/tools/${encodeURIComponent(id)}?force=true`,
          })
        );
      }
      expect(log.warning).not.toHaveBeenCalled();
    });

    it('reinstalls a pre-existing tool on 409 (delete + POST), never silently reuses it', async () => {
      const mod = await import('./persona_matrix_tools_seed');
      const client = createClient(agentWith(), 'conflict');

      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: true });

      // 409 recovery must DELETE the stale definition and POST the current one
      // (multi-model gate workers re-seed against the same stack and can hit a
      // tool left behind by an earlier model's run). The initial POST attempt
      // also counts as a call, so each tool produces two POSTs and one DELETE.
      const toolIds = [...mod.PERSONA_MATRIX_TOOL_IDS, ...mod.PERSONA_MATRIX_PARITY_TOOL_IDS];
      const deletes = client.request.mock.calls
        .filter(([req]) => req.method === 'DELETE')
        .map(([req]) => req);
      const posts = client.request.mock.calls.filter(([req]) => req.method === 'POST');
      expect(deletes).toHaveLength(toolIds.length);
      expect(posts).toHaveLength(toolIds.length * 2);
      for (const id of toolIds) {
        expect(deletes).toContainEqual(
          expect.objectContaining({
            method: 'DELETE',
            path: `/api/agent_builder/tools/${encodeURIComponent(id)}`,
          })
        );
      }
      // Reinstalled tools are NOT added to createdToolIds: cleanup force-deletes only
      // tools this run created fresh, so the reinstalled definitions survive for the
      // next model worker (which 409s and refreshes them again).
      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });
      const cleanupDeletes = client.request.mock.calls
        .filter(([req]) => req.method === 'DELETE' && String(req.path).endsWith('force=true'))
        .map(([req]) => req.path);
      expect(cleanupDeletes).toHaveLength(0);
    });

    it('warns and keeps the existing tool when the 409 reinstall fails', async () => {
      const mod = await import('./persona_matrix_tools_seed');
      const client = createClient(agentWith(), 'conflict');
      // DELETE fails too — recovery must fall back to the existing definition.
      client.request.mockImplementation(
        async ({ method, path }: { method: string; path: string }) => {
          if (method === 'GET' && path === AGENT_TOOLS_PATH) {
            return { data: agentWith() };
          }
          if (method === 'PUT' && path === AGENT_TOOLS_PATH) {
            return { data: {} };
          }
          if (method === 'POST' && path === '/api/agent_builder/tools') {
            throw Object.assign(new Error('Conflict: already exists'), { status: 409 });
          }
          throw Object.assign(new Error('delete blocked'), { status: 403 });
        }
      );

      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: true });

      expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('reinstall failed'));
      // The pre-existing tool was never created by this run; cleanup must NOT delete it.
      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });
      const deletes = client.request.mock.calls.filter(
        ([req]) => req.method === 'DELETE' && String(req.path).endsWith('force=true')
      );
      expect(deletes).toHaveLength(0);
    });
  });
});
