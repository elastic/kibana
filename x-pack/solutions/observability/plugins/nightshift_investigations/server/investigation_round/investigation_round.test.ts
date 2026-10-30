/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { loggerMock } from '@kbn/logging-mocks';
import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { SANDBOX_BASH_TOOL_ID } from '../tools/sandbox_bash/tool';
import { SANDBOX_STR_REPLACE_TOOL_ID } from '../tools/sandbox_bash/str_replace_tool';
import { SANDBOX_VIEW_FILE_TOOL_ID } from '../tools/sandbox_bash/view_file_tool';
import { SANDBOX_WRITE_FILE_TOOL_ID } from '../tools/sandbox_bash/write_file_tool';
import {
  extractWorkspaceReads,
  extractWorkspaceReadsFromToolCalls,
  filterSeededWorkspaceSteps,
  filterSeededWorkspaceToolCalls,
  investigationRoundInputsSchema,
  isEvidenceToolCall,
  isSeededWorkspaceAccess,
  loadInvestigationRound,
  OMITTED_SEEDED_RESULT_REASON,
  resolveConversationRound,
  sliceConversationRounds,
  stepsFromRound,
  withToolResults,
} from '.';

describe('server/investigation_round', () => {
  const request = {} as KibanaRequest;
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withToolResults', () => {
    it('attaches results matched by tool_call_id and preserves unmatched calls', () => {
      const calls = [
        { tool_id: 'tool-a', tool_call_id: 'tc-1', params: { q: 1 } },
        { tool_id: 'tool-b', tool_call_id: 'tc-2', params: { q: 2 } },
      ];
      const results = [{ tool_call_id: 'tc-2', results: [{ type: 'other', data: 'ok' }] }];

      expect(withToolResults(calls, results)).toEqual([
        { tool_id: 'tool-a', tool_call_id: 'tc-1', params: { q: 1 } },
        {
          tool_id: 'tool-b',
          tool_call_id: 'tc-2',
          params: { q: 2 },
          results: [{ type: 'other', data: 'ok' }],
        },
      ]);
    });
  });

  describe('loadInvestigationRound', () => {
    it('loads persisted ConversationRound.steps (including reasoning notes) with retry', async () => {
      const getConversation = jest
        .fn()
        .mockResolvedValueOnce({ id: 'conv-1', rounds: [] })
        .mockResolvedValueOnce({
          id: 'conv-1',
          rounds: [
            {
              id: 'round-1',
              trace_id: 'trace-fg-1',
              started_at: '2026-10-16T00:00:00.000Z',
              steps: [
                { type: 'reasoning', reasoning: 'Checking checkout latency' },
                {
                  type: 'tool_call',
                  tool_id: SANDBOX_BASH_TOOL_ID,
                  tool_call_id: 'tc-1',
                  params: { command: 'curl -s localhost:9200' },
                  results: [{ type: 'other', data: { stdout: 'cluster ok', exit_code: 0 } }],
                },
              ],
            },
          ],
        });

      const agentBuilder = {
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({ get: getConversation }),
        },
      } as unknown as AgentBuilderPluginStart;

      const loaded = await loadInvestigationRound({
        agentBuilder,
        request,
        conversationId: 'conv-1',
        roundId: 'round-1',
        logger,
        retryDelaysMs: [1, 1],
      });

      expect(getConversation).toHaveBeenCalledTimes(2);
      expect(loaded.source).toBe('persisted_round');
      expect(loaded.roundId).toBe('round-1');
      expect(loaded.roundIndex).toBe(0);
      expect(loaded.roundCount).toBe(1);
      expect(loaded.traceId).toBe('trace-fg-1');
      expect(loaded.steps).toEqual([
        { kind: 'reasoning', text: 'Checking checkout latency' },
        {
          kind: 'tool',
          toolId: SANDBOX_BASH_TOOL_ID,
          toolCallId: 'tc-1',
          params: { command: 'curl -s localhost:9200' },
          results: [{ type: 'other', data: { stdout: 'cluster ok', exit_code: 0 } }],
          resultText: 'cluster ok',
          isError: false,
        },
      ]);
    });

    it('falls back to hook tool_calls + tool_results when persisted round is unavailable', async () => {
      const loaded = await loadInvestigationRound({
        agentBuilder: undefined,
        request,
        conversationId: 'conv-1',
        roundId: 'round-1',
        fallbackToolCalls: [
          {
            tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
            tool_call_id: 'tc-1',
            params: { file_path: '/workspace/notes.txt' },
          },
        ],
        fallbackToolResults: [
          {
            tool_call_id: 'tc-1',
            results: [{ type: 'other', data: { text: 'note body' } }],
          },
        ],
        logger,
        retryDelaysMs: [],
      });

      expect(loaded.source).toBe('hook_tool_calls');
      expect(loaded.steps).toEqual([
        {
          kind: 'tool',
          toolId: SANDBOX_VIEW_FILE_TOOL_ID,
          toolCallId: 'tc-1',
          params: { file_path: '/workspace/notes.txt' },
          results: [{ type: 'other', data: { text: 'note body' } }],
          resultText: 'note body',
          isError: false,
        },
      ]);
    });

    it('falls back to tool_call_params_only when neither persisted round nor tool_results exist', async () => {
      const loaded = await loadInvestigationRound({
        agentBuilder: undefined,
        request,
        fallbackToolCalls: [
          {
            tool_id: SANDBOX_BASH_TOOL_ID,
            tool_call_id: 'tc-1',
            params: { command: 'uptime' },
          },
        ],
        logger,
        retryDelaysMs: [],
      });

      expect(loaded.source).toBe('tool_call_params_only');
      expect(loaded.steps).toEqual([
        {
          kind: 'tool',
          toolId: SANDBOX_BASH_TOOL_ID,
          toolCallId: 'tc-1',
          params: { command: 'uptime' },
          isError: false,
        },
      ]);
    });

    it('validates standard round inputs via investigationRoundInputsSchema', () => {
      const schema = z.object(investigationRoundInputsSchema);
      const parsed = schema.parse({
        prompt: 'investigate alert',
        response: 'root cause found',
        conversation_id: 'conv-1',
        round_id: 'round-1',
        round_index: -1,
        tool_calls: JSON.stringify([{ tool_id: 't1', tool_call_id: 'c1', params: {} }]),
        tool_results: JSON.stringify([{ tool_call_id: 'c1', results: [] }]),
      });
      expect(parsed.tool_calls).toHaveLength(1);
      expect(parsed.tool_results).toHaveLength(1);
      expect(parsed.round_index).toBe(-1);
    });

    it('resolves rounds by ordered sequence index, positional/semantic alias, and supports array slicing', async () => {
      const rounds = [
        {
          id: 'round-uuid-0',
          trace_id: 'trace-0',
          started_at: '2026-10-20T00:00:00.000Z',
          steps: [{ type: 'reasoning', reasoning: 'Initial investigation turn' }],
        },
        {
          id: 'round-uuid-1',
          trace_id: 'trace-1',
          started_at: '2026-10-20T00:05:00.000Z',
          steps: [{ type: 'reasoning', reasoning: 'Follow-up turn' }],
        },
        {
          id: 'round-uuid-2',
          trace_id: 'trace-2',
          started_at: '2026-10-20T00:10:00.000Z',
          steps: [{ type: 'reasoning', reasoning: 'Alert outcome causal analysis turn' }],
        },
      ];

      expect(resolveConversationRound(rounds, { roundId: '1st' })).toMatchObject({
        round: { id: 'round-uuid-0' },
        roundIndex: 0,
        roundCount: 3,
      });
      expect(resolveConversationRound(rounds, { roundId: 'investigation_start' })).toMatchObject({
        round: { id: 'round-uuid-0' },
        roundIndex: 0,
      });
      expect(resolveConversationRound(rounds, { roundId: '2nd' })).toMatchObject({
        round: { id: 'round-uuid-1' },
        roundIndex: 1,
      });
      expect(resolveConversationRound(rounds, { roundId: '-1' })).toMatchObject({
        round: { id: 'round-uuid-2' },
        roundIndex: 2,
      });
      expect(resolveConversationRound(rounds, { roundId: 'latest' })).toMatchObject({
        round: { id: 'round-uuid-2' },
        roundIndex: 2,
      });
      expect(resolveConversationRound(rounds, { roundIndex: -2 })).toMatchObject({
        round: { id: 'round-uuid-1' },
        roundIndex: 1,
      });

      // Slicing (e.g. initial rounds before the final follow-up `0..-1`, or just the last round `-1`)
      expect(sliceConversationRounds(rounds, 0, -1).map((r) => [r.roundIndex, r.round.id])).toEqual(
        [
          [0, 'round-uuid-0'],
          [1, 'round-uuid-1'],
        ]
      );
      expect(sliceConversationRounds(rounds, -1).map((r) => [r.roundIndex, r.round.id])).toEqual([
        [2, 'round-uuid-2'],
      ]);

      const agentBuilder = {
        conversations: {
          getScopedClient: jest.fn().mockResolvedValue({
            get: jest.fn().mockResolvedValue({ id: 'conv-1', rounds }),
          }),
        },
      } as unknown as AgentBuilderPluginStart;

      const latestLoaded = await loadInvestigationRound({
        agentBuilder,
        request,
        conversationId: 'conv-1',
        roundIndex: -1,
        logger,
        retryDelaysMs: [],
      });
      expect(latestLoaded.roundId).toBe('round-uuid-2');
      expect(latestLoaded.roundIndex).toBe(2);
      expect(latestLoaded.roundCount).toBe(3);

      const firstByAlias = await loadInvestigationRound({
        agentBuilder,
        request,
        conversationId: 'conv-1',
        roundId: '1st',
        logger,
        retryDelaysMs: [],
      });
      expect(firstByAlias.roundId).toBe('round-uuid-0');
      expect(firstByAlias.roundIndex).toBe(0);
      expect(firstByAlias.roundCount).toBe(3);
    });
  });

  describe('isSeededWorkspaceAccess & filterSeededWorkspaceSteps', () => {
    it('detects all 4 seeded workspace kinds by default across view_file and bash', () => {
      expect(
        isSeededWorkspaceAccess(SANDBOX_VIEW_FILE_TOOL_ID, {
          file_path: '/workspace/cortex/services/checkout.md',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_VIEW_FILE_TOOL_ID, {
          file_path: 'memories/redis-evictions.md',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_VIEW_FILE_TOOL_ID, {
          file_path: '/workspace/decision-trees/decision_tree_cpu.md',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_VIEW_FILE_TOOL_ID, {
          file_path: '/workspace/.connector-docs/elastic.md',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_VIEW_FILE_TOOL_ID, {
          file_path: 'connectors.md',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command: 'cat /workspace/memories/.index.json | jq .',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command: 'grep -rn redis ./cortex/',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_VIEW_FILE_TOOL_ID, {
          file_path: '/workspace/scratch/query_output.json',
        })
      ).toBe(false);
    });

    it('honors parameterized skipRoots when a caller only skips a subset of roots', () => {
      expect(
        isSeededWorkspaceAccess(
          SANDBOX_VIEW_FILE_TOOL_ID,
          { file_path: '/workspace/memories/redis-evictions.md' },
          { skipRoots: ['cortex', 'decision_trees'] }
        )
      ).toBe(false);

      expect(
        isSeededWorkspaceAccess(
          SANDBOX_VIEW_FILE_TOOL_ID,
          { file_path: '/workspace/memories/redis-evictions.md' },
          { skipRoots: ['memories'] }
        )
      ).toBe(true);
    });

    it('supports both drop_step and omit_result modes on steps and toolCalls', () => {
      const steps = stepsFromRound([
        { type: 'reasoning', reasoning: 'Let me check memories first' },
        {
          type: 'tool_call',
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          tool_call_id: 'tc-mem',
          params: { file_path: '/workspace/memories/checkout.md' },
          results: [{ type: 'other', data: 'memory content' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          tool_call_id: 'tc-ev',
          params: { command: 'curl -s http://localhost:9200/_cat/Indices' },
          results: [{ type: 'other', data: 'green open logs-1' }],
        },
      ]);

      const dropped = filterSeededWorkspaceSteps(steps, { mode: 'drop_step' });
      expect(dropped).toHaveLength(2);
      expect(dropped[0]).toEqual({ kind: 'reasoning', text: 'Let me check memories first' });
      expect(dropped[1]).toMatchObject({ kind: 'tool', toolCallId: 'tc-ev' });

      const omitted = filterSeededWorkspaceSteps(steps, { mode: 'omit_result' });
      expect(omitted).toHaveLength(3);
      expect(omitted[1]).toMatchObject({
        kind: 'tool',
        toolCallId: 'tc-mem',
        resultText: `omitted: ${OMITTED_SEEDED_RESULT_REASON}`,
      });

      const filteredCalls = filterSeededWorkspaceToolCalls(
        [
          {
            tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
            tool_call_id: 'tc-mem',
            params: { file_path: '/workspace/memories/checkout.md' },
            results: [{ type: 'other', data: 'memory content' }],
          },
        ],
        { mode: 'omit_result' }
      );
      expect(filteredCalls[0].results).toEqual([
        {
          tool_result_id: 'tc-mem-omitted',
          type: 'other',
          data: { omitted: OMITTED_SEEDED_RESULT_REASON },
        },
      ]);
    });

    it('filters non-evidence process tools when skipNonEvidenceTools is true', () => {
      expect(
        isEvidenceToolCall(SANDBOX_WRITE_FILE_TOOL_ID, { file_path: '/workspace/a.txt' })
      ).toBe(false);
      expect(
        isEvidenceToolCall('platform.streams.investigation_progress_report', { summary: 'step' })
      ).toBe(false);
      expect(isEvidenceToolCall(SANDBOX_BASH_TOOL_ID, { command: 'ps aux' })).toBe(true);
    });
  });

  describe('extractWorkspaceReads', () => {
    it('extracts canonical Cortex, Memory, and Decision Tree IDs and indexReads across file tools and bash', () => {
      const steps = stepsFromRound([
        {
          type: 'tool_call',
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/cortex/INDEX.md' },
          results: [{ type: 'other', data: '# Cortex index' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/cortex/README.md' },
          results: [{ type: 'other', data: '# README' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/cortex/services/checkout-service.md' },
          results: [{ type: 'other', data: '# Checkout' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            command:
              'jq . /workspace/memories/.index.json && cat /workspace/memories/redis-pool-exhaustion.md && head cortex/alerts/high-latency.md',
          },
          results: [{ type: 'other', data: { stdout: '...', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: 'decision-trees/monitors.md' },
          results: [{ type: 'other', data: '| Filename | Symptom |' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_STR_REPLACE_TOOL_ID,
          params: { file_path: '/workspace/decision-trees/decision_tree_payment-5xx.md' },
          results: [{ type: 'other', data: 'updated' }],
        },
      ]);

      const reads = extractWorkspaceReads(steps);
      expect(reads).toEqual({
        cortexIds: ['cortex_service_checkout-service', 'cortex_alert_high-latency'],
        memoryIds: ['memory_redis-pool-exhaustion'],
        decisionTreeIds: ['symptom:payment-5xx'],
        indexReads: {
          cortexIndex: true,
          memoryIndex: true,
          decisionTreeIndex: true,
        },
      });
    });

    it('excludes failed tool calls (type=error or non-zero bash exit_code) from impressions', () => {
      const steps = stepsFromRound([
        {
          type: 'tool_call',
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/memories/missing-page.md' },
          results: [{ type: 'error', data: { message: 'ENOENT: no such file' } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: { command: 'cat /workspace/cortex/services/missing-service.md' },
          results: [{ type: 'other', data: { stderr: 'No such file', exit_code: 1 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          params: { file_path: '/workspace/memories/valid-page.md' },
          results: [{ type: 'other', data: { text: 'valid content' } }],
        },
      ]);

      const reads = extractWorkspaceReads(steps);
      expect(reads.memoryIds).toEqual(['memory_valid-page']);
      expect(reads.cortexIds).toEqual([]);
    });

    it('supports extractWorkspaceReadsFromToolCalls for hook payloads', () => {
      const reads = extractWorkspaceReadsFromToolCalls([
        {
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          tool_call_id: 'tc-1',
          params: { file_path: '/workspace/decision-trees/decision_tree_checkout-latency.md' },
          results: [{ type: 'other', data: 'tree' }],
        },
        {
          tool_id: SANDBOX_VIEW_FILE_TOOL_ID,
          tool_call_id: 'tc-2',
          params: { file_path: '/workspace/decision-trees/decision_tree_failed-open.md' },
          results: [{ type: 'error', data: 'ENOENT' }],
        },
      ]);

      expect(reads.decisionTreeIds).toEqual(['symptom:checkout-latency']);
    });

    it('resolves relative bash references against working_directory and excludes write-only operations from Cortex/Memory impressions', () => {
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          working_directory: '/workspace/memories',
          command: 'cat redis-pool-exhaustion.md',
        })
      ).toBe(true);

      // A telemetry curl command running with working_directory inside a seeded root does not access seeded files
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          working_directory: '/workspace/memories',
          command: 'curl -s https://localhost:9200/_cluster/health | jq .',
        })
      ).toBe(false);

      // Relative cross-root path resolves against working_directory and checks the target root
      expect(
        isSeededWorkspaceAccess(
          SANDBOX_BASH_TOOL_ID,
          {
            working_directory: '/workspace/memories',
            command: 'cat ../cortex/services/checkout-service.md',
          },
          { skipRoots: ['cortex'] }
        )
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(
          SANDBOX_BASH_TOOL_ID,
          {
            working_directory: '/workspace/memories',
            command: 'cat redis-pool-exhaustion.md',
          },
          { skipRoots: ['cortex'] }
        )
      ).toBe(false);

      // Content searches relative to a seeded working_directory (e.g. grep -R services/ or rg redis)
      expect(
        isSeededWorkspaceAccess(
          SANDBOX_BASH_TOOL_ID,
          {
            working_directory: '/workspace/cortex',
            command: 'grep -R redis services/',
          },
          { skipRoots: ['cortex'] }
        )
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(
          SANDBOX_BASH_TOOL_ID,
          {
            working_directory: '/workspace/memories',
            command: 'rg redis',
          },
          { skipRoots: ['memories'] }
        )
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(
          SANDBOX_BASH_TOOL_ID,
          {
            working_directory: '/workspace/memories',
            command: "printf 'redis\\n' | grep -R -f - .",
          },
          { skipRoots: ['memories'] }
        )
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(
          SANDBOX_BASH_TOOL_ID,
          {
            working_directory: '/workspace/memories',
            command: 'grep -i error /tmp/query-results.json',
          },
          { skipRoots: ['memories'] }
        )
      ).toBe(false);

      // Quoted query values in curl/esql vs escaped filenames in python -c
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command:
            'curl -s localhost:9200/_search -d \'{"query":{"term":{"service.name":"cortex"}}}\'',
        })
      ).toBe(false);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          working_directory: '/workspace/memories',
          command: 'python3 -c "print(open(\\"redis-pool-exhaustion.md\\").read())"',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command: 'grep -efoo /workspace/memories/redis-pool-exhaustion.md',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command: 'grep -e error -ecache /workspace/memories/redis-pool-exhaustion.md',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command: 'rg redis',
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command: 'grep -R redis .',
        })
      ).toBe(true);

      // Executable Python heredoc reading a seeded file (including open(Path(...))) vs write-only heredoc
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command:
            "python - <<'PY'\nprint(open(Path('/workspace/memories/redis-pool-exhaustion.md')).read())\nPY",
        })
      ).toBe(true);
      expect(
        isSeededWorkspaceAccess(SANDBOX_BASH_TOOL_ID, {
          command: "cat <<'EOF' > /tmp/note.txt\n/workspace/memories/redis-pool-exhaustion.md\nEOF",
        })
      ).toBe(false);

      const steps = stepsFromRound([
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            working_directory: '/workspace/memories',
            command: 'cat redis-pool-exhaustion.md 2>/dev/null && jq ".count > 0" .index.json',
          },
          results: [{ type: 'other', data: { stdout: '...', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            command:
              "python3 - <<'PY'\nprint(open(Path('/workspace/memories/heredoc-read.md')).read())\npath = '/workspace/memories/heredoc-written.md'\nwith open(path, 'w') as f:\n    f.write('x')\nPY",
          },
          results: [{ type: 'other', data: { stdout: '...', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            command:
              'python3 -c "p=\'/workspace/memories/inline-script-read.md\'; print(open(p).read())"',
          },
          results: [{ type: 'other', data: { stdout: '...', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            working_directory: 'cortex/services',
            command: 'cat checkout-service.md',
          },
          results: [{ type: 'other', data: { stdout: '...', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            working_directory: '/workspace/memories',
            command:
              "printf 'new content' > fresh-note.md && echo 'x' | tee tee-note.md && cp redis-pool-exhaustion.md copied-note.md && sed -E -i 's/a/b/' sed-note.md",
          },
          results: [{ type: 'other', data: { stdout: '', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            working_directory: '/workspace/cortex/services',
            command: "cat <<'EOF' > unwritten-service.md\n# Service\nEOF",
          },
          results: [{ type: 'other', data: { stdout: '', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_BASH_TOOL_ID,
          params: {
            command:
              'ls -l /workspace/memories/metadata-only.md && test -f /workspace/memories/metadata-only.md',
          },
          results: [{ type: 'other', data: { stdout: '...', exit_code: 0 } }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_STR_REPLACE_TOOL_ID,
          params: {
            file_path: '/workspace/memories/str-replaced-without-reading.md',
            old_str: 'a',
            new_str: 'b',
          },
          results: [{ type: 'other', data: 'replaced' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_WRITE_FILE_TOOL_ID,
          params: {
            file_path: '/workspace/memories/overwritten-without-reading.md',
            content: 'new content',
          },
          results: [{ type: 'other', data: 'written' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_WRITE_FILE_TOOL_ID,
          params: {
            file_path: '/workspace/cortex/services/overwritten-service.md',
            content: 'new content',
          },
          results: [{ type: 'other', data: 'written' }],
        },
        {
          type: 'tool_call',
          tool_id: SANDBOX_WRITE_FILE_TOOL_ID,
          params: {
            file_path: '/workspace/decision-trees/decision_tree_edited-tree.md',
            content: 'new tree',
          },
          results: [{ type: 'other', data: 'written' }],
        },
      ]);

      const reads = extractWorkspaceReads(steps);
      expect(reads.memoryIds).toEqual([
        'memory_redis-pool-exhaustion',
        'memory_heredoc-read',
        'memory_inline-script-read',
      ]);
      expect(reads.cortexIds).toEqual(['cortex_service_checkout-service']);
      expect(reads.decisionTreeIds).toEqual(['symptom:edited-tree']);
      expect(reads.indexReads.memoryIndex).toBe(true);
    });
  });
});
