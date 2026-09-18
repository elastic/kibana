/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityRuleGenerationClient, type EvalFetch } from './chat_client';

const CONVERSE_API_PATH = '/api/agent_builder/converse';

interface FetchCall {
  path: string;
  options?: Record<string, unknown>;
}

const createFetchStub = (response: unknown) => {
  const calls: FetchCall[] = [];
  const fetch: EvalFetch = async (path, options) => {
    calls.push({ path, options });
    return response;
  };
  return { fetch, calls };
};

const ruleCreationResponse = () => ({
  steps: [
    { type: 'tool_call', tool_id: 'security.create_detection_rule' },
    {
      type: 'tool_result',
      tool_id: 'security.create_detection_rule',
      results: [
        {
          type: 'other',
          data: {
            success: true,
            rule: {
              name: 'Credential Access via LSASS Memory Dump',
              description: 'Detects credential dumping against lsass.exe',
              query: 'FROM logs-windows.* | WHERE process.name == "lsass.exe"',
              language: 'esql',
              type: 'esql',
              severity: 'high',
              risk_score: 73,
            },
          },
        },
      ],
    },
  ],
  trace_id: 'trace-1',
});

describe('SecurityRuleGenerationClient', () => {
  describe('converse request payload', () => {
    it('omits agent_id so the API resolves the default Elastic AI agent', async () => {
      const { fetch, calls } = createFetchStub(ruleCreationResponse());
      const client = new SecurityRuleGenerationClient(fetch, { warning: jest.fn() }, 'connector-1');

      await client.generateRule('Create a rule that detects credential dumping');

      expect(calls).toHaveLength(1);
      expect(calls[0].path).toBe(CONVERSE_API_PATH);

      const rawBody = String(calls[0].options?.body);
      const body = JSON.parse(rawBody) as Record<string, unknown>;

      // `agent_id` must not be sent: the legacy 'security.agent' id no longer
      // exists in the product, and sending it fails the whole eval run.
      expect(Object.keys(body)).not.toContain('agent_id');
      expect(body).not.toHaveProperty('agent_id');
      expect(rawBody).not.toContain('security.agent');

      // The rest of the request contract is unchanged.
      expect(body.connector_id).toBe('connector-1');
    });
  });
});
