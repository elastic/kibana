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

const agentWith = (tools?: Array<Record<string, unknown>>) => ({
  name: 'Elastic AI Agent',
  description: 'desc',
  access_control: { access_mode: 'public' },
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

    it('does NOT delete pre-existing tools (POST returns 409 conflict)', async () => {
      const mod = await import('./persona_matrix_tools_seed');
      const client = createClient(agentWith(), 'conflict');

      await mod.seedPersonaMatrixTools({ kbnClient: asKbn(client), log, parity: true });
      await mod.cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const deletes = client.request.mock.calls.filter(([req]) => req.method === 'DELETE');
      expect(deletes).toHaveLength(0);
    });
  });
});
