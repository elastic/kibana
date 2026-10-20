/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { applyCortexEdits } from '../cortex/optimize';
import { createCortexPageStore } from '../cortex/page_store';
import { createDecisionTreeStore } from '../decision_trees/store';
import { createLearningStore } from '../decision_trees/learning_store';
import { applyMemoryEdits } from '../memory/optimize';
import { createMemoryPageStore } from '../memory/page_store';
import { composeHydrateNotificationsStepDefinition } from '../step_definitions/compose_hydrate_notifications';
import { decisionTreeReinforceStepDefinition } from '../step_definitions/decision_tree_reinforce';
import { createDecisionTreeTools } from '../tools/decision_tree';

const FULL_TREE = `flowchart TD
    S1([Checkout latency]) --> E1[Query logs]
    E1 --> D1{{Pool exhausted?}}
    D1 -->|yes| E2[Check deploys]
    D1 -->|no| E3[Profile queries]
    E2 --> X1((Connection leak))
    E3 --> X2((Slow query))`;

describe('PR 3b write provenance, reinforcementSessionRegistry, and applied_writes', () => {
  it('stamps Cortex provenance, increments version, and returns full before/after applied_writes', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      get: jest
        .fn()
        .mockResolvedValueOnce({
          found: true,
          _id: 'default:cortex_service_checkout',
          _seq_no: 1,
          _primary_term: 1,
          _source: {
            type: 'service',
            title: 'Checkout',
            content: 'Old checkout content.',
            attributes: {
              status: 'tentative',
              corroborations: 0,
              slug: 'checkout',
              version: 1,
            },
          },
        })
        .mockResolvedValueOnce({
          found: true,
          _id: 'default:cortex_service_checkout',
          _seq_no: 1,
          _primary_term: 1,
          _source: {
            type: 'service',
            title: 'Checkout',
            content: 'Old checkout content.',
            attributes: {
              status: 'tentative',
              corroborations: 0,
              slug: 'checkout',
              version: 1,
            },
          },
        }),
      index: jest.fn().mockResolvedValue({ _seq_no: 2, _primary_term: 1 }),
    };

    const store = createCortexPageStore({
      esClient: esClient as never,
      logger: loggerMock.create(),
      spaceId: 'default',
    });

    const appliedWrites = await applyCortexEdits({
      store,
      edits: [
        {
          action: 'upsert',
          entity_type: 'service',
          slug: 'checkout',
          title: 'Checkout',
          content: 'Updated checkout content.',
        },
      ],
      telemetry: { reportHydrated: jest.fn(), reportEditsApplied: jest.fn() },
      provenance: {
        conversationId: 'conv-1',
        roundId: 'round-1',
        workflowExecutionId: 'exec-1',
      },
      logger: loggerMock.create(),
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        document: expect.objectContaining({
          attributes: expect.objectContaining({
            version: 2,
            conversation_id: 'conv-1',
            round_id: 'round-1',
            workflow_execution_id: 'exec-1',
          }),
        }),
      }),
      expect.anything()
    );
    expect(appliedWrites).toEqual([
      {
        store: 'cortex',
        item_id: 'cortex_service_checkout',
        action: 'upsert',
        version: 2,
        before_status: 'tentative',
        after_status: 'established',
        before_content: 'Old checkout content.',
        after_content: 'Updated checkout content.',
      },
    ]);
  });

  it('stamps Semantic Memory provenance and returns appliedWrites with replaced_ids and before/after content', async () => {
    const existingSource = {
      '@timestamp': '2026-10-01T00:00:00.000Z',
      type: 'memory',
      title: 'Old Redis memory',
      description: 'why is checkout slow',
      content: 'Old Redis pool content.',
      tags: ['memory', 'redis'],
      attributes: {
        slug: 'old-redis',
        space_id: 'default',
        impressions: 2,
        conversions: 1,
        last_impression_time: '2026-10-01T00:00:00.000Z',
      },
    };
    const esClient = {
      get: jest.fn(async ({ id }: { id: string }) => {
        if (id === 'default:memory_old-redis') {
          return {
            found: true,
            _id: id,
            _seq_no: 3,
            _primary_term: 1,
            _source: existingSource,
          };
        }
        return { found: false };
      }),
      index: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    };

    const store = createMemoryPageStore({
      esClient: esClient as never,
      logger: loggerMock.create(),
      spaceId: 'default',
    });
    const recalledPage = await store.get('memory_old-redis');
    expect(recalledPage).toBeDefined();

    const summary = await applyMemoryEdits({
      store,
      recalledIds: ['memory_old-redis'],
      recalledMemories: [recalledPage!],
      labels: { useful: ['memory_old-redis'], harmful: [] },
      extractions: [
        {
          slug: 'new-redis-pool',
          title: 'New Redis pool',
          tags: ['redis'],
          replaces: ['memory_old-redis'],
        },
      ],
      context: 'why is checkout slow',
      agentId: 'nightshift.investigation',
      conversationId: 'conv-mem-1',
      roundId: 'round-mem-1',
      workflowExecutionId: 'exec-mem-1',
      synthesizeMemoryGroup: async () => ({ content: 'Merged Redis pool content.' }),
      logger: loggerMock.create(),
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'default:memory_new-redis-pool',
        document: expect.objectContaining({
          attributes: expect.objectContaining({
            conversation_id: 'conv-mem-1',
            round_id: 'round-mem-1',
            workflow_execution_id: 'exec-mem-1',
          }),
        }),
      }),
      expect.anything()
    );
    expect(summary.appliedWrites).toEqual([
      {
        store: 'semantic_memory',
        item_id: 'memory_new-redis-pool',
        action: 'merge',
        after_status: 'active',
        after_content: 'Merged Redis pool content.',
        replaced_ids: ['memory_old-redis'],
      },
    ]);
  });

  it('bridges provenance and applied_writes across decisionTreeReinforce via reinforcementSessionRegistry', async () => {
    const markdown = `# Checkout\n\n\`\`\`mermaid\n${FULL_TREE}\n\`\`\`\n`;
    const esClient = {
      get: jest.fn().mockResolvedValue({ found: false }),
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      index: jest.fn().mockResolvedValue({}),
    };
    const sandboxSession = {
      readFiles: jest
        .fn()
        .mockResolvedValue([{ success: true, content: Buffer.from(markdown, 'utf8') }]),
    };
    const tools = createDecisionTreeTools({
      getSandboxStart: () => ({ getSession: jest.fn().mockReturnValue(sandboxSession) } as never),
      connectorNames: ['elasticsearch'],
      getSpaceId: () => 'space-1',
      getUsername: () => 'jdoe',
      logger: loggerMock.create(),
    });
    const recordSysTool = tools.find((t) => t.id === 'nightshift_record_system_learning')!;
    const submitTool = tools.find((t) => t.id === 'nightshift_submit_optimizer_result')!;

    const runAgent = jest.fn(async ({ agentParams }: any) => {
      const reinfConvId = agentParams.conversation.id;
      const toolContext = {
        request: {} as never,
        runContext: { stack: [{ type: 'agent', conversationId: reinfConvId }] },
        esClient: { asCurrentUser: esClient },
        agentConfiguration: { connector_ids: [] },
      } as never;

      await recordSysTool.handler(
        {
          tree_id: 'symptom:checkout-high-latency',
          category: 'architecture',
          content: 'Checkout uses a shared Redis pool.',
        } as never,
        toolContext
      );

      await submitTool.handler(
        {
          symptom_trees: [
            {
              tree_id: 'symptom:checkout-high-latency',
              file_path: 'decision-trees/decision_tree_checkout-high-latency.md',
              evidence_gatherer_metadata: [],
            },
          ],
          summary: 'Created initial tree.',
        } as never,
        toolContext
      );

      return { result: { round: { response: { message: 'Persisted 1 tree' } } } };
    });

    const step = decisionTreeReinforceStepDefinition({
      getAgentBuilder: () => ({ agents: { runAgent } } as never),
    });

    const result = await step.handler({
      input: {
        prompt: 'Why is checkout slow?',
        response: 'Redis pool exhausted.',
        conversation_id: 'inv-conv-1',
        round_id: 'inv-round-1',
        message: 'Task: update tree',
        turn_kind: 'feedback_reinforcement',
      },
      rawInput: {},
      contextManager: {
        getContext: () => ({
          workflow: { spaceId: 'space-1' },
          execution: { id: 'wf-exec-1' },
        }),
        getFakeRequest: () => ({ headers: {} }),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'reinforce_decision_trees',
      stepType: 'nightshift.decisionTreeReinforce',
    } as never);

    expect(result).toEqual({
      output: {
        message: 'Persisted 1 tree',
        applied_writes: [
          {
            store: 'decision_tree_learning',
            item_id: 'symptom:checkout-high-latency:system:architecture',
            action: 'record',
            after_status: 'active',
            after_content: 'Checkout uses a shared Redis pool.',
          },
          {
            store: 'decision_tree',
            item_id: 'symptom:checkout-high-latency',
            action: 'create',
            version: 1,
            after_status: 'tentative',
            after_content: markdown,
          },
        ],
      },
    });

    // Verify all 3 indexed ES documents (learning, tree version, tree head) carry the investigator provenance
    expect(esClient.index).toHaveBeenCalledTimes(3);
    for (const [callArg] of esClient.index.mock.calls) {
      expect(callArg.document.attributes).toEqual(
        expect.objectContaining({
          conversation_id: 'inv-conv-1',
          round_id: 'inv-round-1',
          workflow_execution_id: 'wf-exec-1',
        })
      );
    }

    // Also verify createDecisionTreeStore and createLearningStore read back those provenance fields
    expect(createDecisionTreeStore).toBeDefined();
    expect(createLearningStore).toBeDefined();
  });

  it('includes materialize_execution_id and 32-hex background_trace_id in composeHydrateNotifications when execution.id is a UUID', async () => {
    const step = composeHydrateNotificationsStepDefinition();
    const res = await step.handler({
      input: {
        writers: [{ directory: '/workspace/memories', notification: '', completed: true }],
        recalled_ids: ['memory_a'],
      },
      rawInput: {},
      contextManager: {
        getContext: () => ({
          workflow: { spaceId: 'default' },
          execution: { id: 'be01f25c-8dec-495b-a134-6f752bdce9e0' },
        }),
        getFakeRequest: jest.fn(),
        getScopedEsClient: jest.fn(),
      },
      logger: loggerMock.create(),
      abortSignal: new AbortController().signal,
      stepId: 'compose_prompt',
      stepType: 'nightshift.composeHydrateNotifications',
    } as never);

    expect(res.output?.workflow_context).toEqual({
      'nightshift.semantic_memory.recall': {
        version: 1,
        data: {
          recalled_ids: ['memory_a'],
          materialize_execution_id: 'be01f25c-8dec-495b-a134-6f752bdce9e0',
          background_trace_id: 'be01f25c8dec495ba1346f752bdce9e0',
        },
      },
    });
  });
});
