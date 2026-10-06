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

const createClient = (agent: Record<string, unknown> = agentWith()): MockClient => ({
  request: jest.fn(async ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === AGENT_TOOLS_PATH) {
      return agent;
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
    it('deletes both tool sets with force=true and swallows 404s without warning', async () => {
      const { cleanupPersonaMatrixTools, PERSONA_MATRIX_TOOL_IDS, PERSONA_MATRIX_PARITY_TOOL_IDS } =
        await import('./persona_matrix_tools_seed');
      const client: MockClient = {
        request: jest
          .fn()
          .mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 })),
      };

      await cleanupPersonaMatrixTools({ kbnClient: asKbn(client), log });

      const expectedIds = [...PERSONA_MATRIX_TOOL_IDS, ...PERSONA_MATRIX_PARITY_TOOL_IDS];
      expect(client.request).toHaveBeenCalledTimes(expectedIds.length);
      for (const id of expectedIds) {
        expect(client.request).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'DELETE',
            path: `/api/agent_builder/tools/${encodeURIComponent(id)}?force=true`,
          })
        );
      }
      expect(log.warning).not.toHaveBeenCalled();
    });
  });
});
