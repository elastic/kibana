/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityRuleGenerationClient, type EvalFetch } from './chat_client';

const CONVERSE_API_PATH = '/api/agent_builder/converse';
const CANONICAL_TOOL = 'security.create_detection_rule';

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
    { type: 'tool_call', tool_id: CANONICAL_TOOL },
    {
      type: 'tool_result',
      tool_id: CANONICAL_TOOL,
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

const noRuleResponse = () => ({
  steps: [{ type: 'tool_call', tool_id: CANONICAL_TOOL }],
  trace_id: 'trace-1',
});

const stepsResponse = (steps: Array<Record<string, unknown>>, traceId?: string | string[]) => ({
  steps,
  trace_id: traceId,
});

const createClient = (fetch: EvalFetch) =>
  new SecurityRuleGenerationClient(fetch, { warning: jest.fn() }, 'connector-1');

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

  describe('trace and tool-call propagation', () => {
    it('returns the trace id and ordered tool calls that the trace evaluators consume', async () => {
      const { fetch } = createFetchStub(ruleCreationResponse());

      const result = await createClient(fetch).generateRule('Create a rule');

      expect(result.generatedRule?.name).toBe('Credential Access via LSASS Memory Dump');
      expect(result.traceId).toBe('trace-1');
      expect(result.toolCalls).toEqual([CANONICAL_TOOL]);
    });

    it('coerces an array-valued trace_id to its first entry', async () => {
      const { fetch } = createFetchStub({
        ...ruleCreationResponse(),
        trace_id: ['trace-a', 'trace-b'],
      });

      const result = await createClient(fetch).generateRule('Create a rule');

      expect(result.traceId).toBe('trace-a');
    });

    it('still propagates trace id and tool calls when no rule was returned', async () => {
      const { fetch } = createFetchStub(noRuleResponse());

      const result = await createClient(fetch).generateRule('Create a rule');

      expect(result.generatedRule).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.traceId).toBe('trace-1');
      expect(result.toolCalls).toEqual([CANONICAL_TOOL]);
    });

    it('drops calls that load the expected detection-rule-edit SKILL.md', async () => {
      const { fetch } = createFetchStub(
        stepsResponse([
          // `load_skill` takes the skill name or path (`skill` is the tool's only parameter).
          { type: 'tool_call', tool_id: 'load_skill', params: { skill: 'detection-rule-edit' } },
          {
            type: 'tool_call',
            tool_id: 'load_skill',
            params: { skill: '/skills/detection-rule-edit/SKILL.md' },
          },
          // The folder path is a supported `load_skill` form too.
          {
            type: 'tool_call',
            tool_id: 'load_skill',
            params: { skill: '/skills/detection-rule-edit' },
          },
          {
            type: 'tool_call',
            tool_id: 'read_file',
            params: { path: '/skills/detection-rule-edit/SKILL.md' },
          },
          {
            type: 'tool_call',
            tool_id: 'filestore.read',
            params: { path: '/skills/detection-rule-edit/SKILL.md' },
          },
          { type: 'tool_call', tool_id: CANONICAL_TOOL },
        ])
      );

      const result = await createClient(fetch).generateRule('Create a rule');

      expect(result.toolCalls).toEqual([CANONICAL_TOOL]);
    });

    it('keeps skill-routing tool calls that do not name the expected skill', async () => {
      const { fetch } = createFetchStub(
        stepsResponse([
          { type: 'tool_call', tool_id: 'load_skill', params: { skill: 'some-other-skill' } },
          // A substring match on the serialized arguments would drop this, while the evaluator's
          // span query requires the delimited `"skill":"detection-rule-edit"` value.
          { type: 'tool_call', tool_id: 'load_skill', params: { skill: 'detection-rule-edit-v2' } },
          // A neighbouring *folder* — the checks are anchored at the value's end, so this stays
          // visible as well.
          {
            type: 'tool_call',
            tool_id: 'load_skill',
            params: { skill: '/skills/detection-rule-edit-v2' },
          },
          { type: 'tool_call', tool_id: 'read_file', params: { path: '/etc/passwd' } },
          // Same path shape as an expected SKILL.md load, different skill.
          {
            type: 'tool_call',
            tool_id: 'read_file',
            params: { path: '/skills/threat-hunting/SKILL.md' },
          },
          { type: 'tool_call', tool_id: 'filestore.read', params: { path: '/tmp/notes.md' } },
        ])
      );

      const result = await createClient(fetch).generateRule('Create a rule');

      // Filtering by tool id alone would hide these entirely: a negative case would then
      // look like an empty (perfect) trajectory, and a positive case could never report
      // them as extra tools.
      expect(result.toolCalls).toEqual([
        'load_skill',
        'load_skill',
        'load_skill',
        'read_file',
        'read_file',
        'filestore.read',
      ]);
    });
  });

  describe('retry policy on a non-idempotent conversation', () => {
    const statusError = (status: number) =>
      Object.assign(new Error(`[POST /api/agent_builder/converse] ${status} failed`), { status });

    const networkError = (code: string, message = `request failed: ${code}`) =>
      Object.assign(new Error(message), { code });

    const createFailingFetch = (errors: Error[]) => {
      const calls: FetchCall[] = [];
      const fetch: EvalFetch = async (path, options) => {
        calls.push({ path, options });
        const error = errors[Math.min(calls.length - 1, errors.length - 1)];
        throw error;
      };
      return { fetch, calls };
    };

    it('retries a 503 (the service declined to process the round)', async () => {
      const { fetch: failingFetch, calls } = createFailingFetch([statusError(503)]);
      let attempts = 0;
      const fetch: EvalFetch = async (path, options) => {
        attempts++;
        if (attempts === 1) {
          return failingFetch(path, options);
        }
        return ruleCreationResponse();
      };

      const result = await createClient(fetch).generateRule('Create a rule');

      expect(attempts).toBe(2);
      expect(calls).toHaveLength(1);
      expect(result.generatedRule).toBeDefined();
    });

    it('retries a connection that was never established', async () => {
      let attempts = 0;
      const fetch: EvalFetch = async () => {
        attempts++;
        if (attempts === 1) {
          // Mirrors `KbnClientRequesterError`: the network code arrives on the cause chain.
          throw Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5601'), {
            cause: networkError('ECONNREFUSED'),
          });
        }
        return ruleCreationResponse();
      };

      const result = await createClient(fetch).generateRule('Create a rule');

      expect(attempts).toBe(2);
      expect(result.generatedRule).toBeDefined();
    });

    it.each([
      ['a reset connection (ECONNRESET)', networkError('ECONNRESET')],
      ['a timed out connection (ETIMEDOUT)', networkError('ETIMEDOUT')],
      ['a 500 after the round may have run', statusError(500)],
      ['a 504 gateway timeout', statusError(504)],
      ['a deterministic 400', statusError(400)],
    ])('does not retry %s', async (_label, error) => {
      const { fetch, calls } = createFailingFetch([error]);

      await expect(createClient(fetch).generateRule('Create a rule')).rejects.toThrow();

      // A retry here would start a second conversation and create the rule twice,
      // keeping only the second attempt's trace.
      expect(calls).toHaveLength(1);
    });
  });
});
