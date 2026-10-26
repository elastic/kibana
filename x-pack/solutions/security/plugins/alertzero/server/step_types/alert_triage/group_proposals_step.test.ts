/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { generationIds } from '../../alert_triage/group_proposals';
import { hashKey } from '../../alert_triage/key_tags';
import { buildPatternKeys } from '../../alert_triage/pattern_key';
import {
  getTriageGroupFpCandidatesStepDefinition,
  getTriageJoinProposalStepDefinition,
} from './group_proposals_step';

type StepOutput = Record<string, unknown> & {
  mints: Array<Record<string, unknown> & { proposal_id: string }>;
  joined: boolean;
};

const SPACE = 'default';
const ALERT = {
  'kibana.alert.rule.uuid': 'rule-1',
  process: { executable: '/usr/bin/tool' },
  host: { name: 'h1' },
};
const KEY_HASH = hashKey(SPACE, buildPatternKeys(ALERT).wide);
const [GEN0, GEN1] = generationIds(SPACE, KEY_HASH);

const baseInput = {
  autonomy: 'manual' as const,
  space_id: SPACE,
  rule_name: 'Rule A',
  confidence_floor: 0.85,
};

const openHead = (overrides: Record<string, unknown> = {}) => ({
  id: GEN0,
  rootProposalId: GEN0,
  revision: 1,
  status: 'pending',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000 * 60).toISOString(),
  conversationId: 'conv-owner',
  actionInput: { alertIds: ['old-1'] },
  workflowExecutionId: 'gate-1',
  ...overrides,
});

const setup = ({
  heads = [] as Array<Record<string, unknown>>,
  gateStatus = ExecutionStatus.WAITING_FOR_INPUT as ExecutionStatus,
  investigationStatus = 'open',
  groupingEnabled = true,
  history = { falsePositive: 0, truePositive: 0 } as
    | { falsePositive: number; truePositive: number }
    | 'fails',
} = {}) => {
  const service = {
    list: jest.fn().mockResolvedValue({ proposals: heads, total: heads.length }),
    revise: jest.fn().mockResolvedValue({ proposalId: 'revision-id', revision: 2 }),
  };
  const management = {
    getWorkflowExecution: jest.fn().mockResolvedValue({ status: gateStatus }),
  };
  const callKibanaApi = jest.fn(async ({ body }) => {
    if (body.aggs?.verdicts) {
      if (history === 'fails') throw new Error('search failed');
      return {
        status: 200,
        headers: {},
        body: {
          aggregations: {
            verdicts: {
              buckets: {
                falsePositive: { doc_count: history.falsePositive },
                truePositive: { doc_count: history.truePositive },
              },
            },
          },
        },
      };
    }
    return {
      status: 200,
      headers: {},
      body: {
        hits: {
          hits: (body.query.ids.values as string[]).map((id) => ({
            _id: id,
            _index: 'alerts',
            _source: ALERT,
          })),
        },
      },
    };
  });
  const definition = (factory: typeof getTriageGroupFpCandidatesStepDefinition) =>
    factory({
      getProposals: () =>
        ({
          getProposalsService: () => service,
          getProposalPrivileges: () => ({ assertCanRead: jest.fn() }),
        } as never),
      getWorkflowsManagement: () => management as never,
      getConversations: () =>
        ({
          getScopedClient: async () => ({
            get: async () => ({ metadata: { status: investigationStatus } }),
          }),
        } as never),
      isGroupingEnabled: async () => groupingEnabled,
    });
  const context = (input: Record<string, unknown>) =>
    ({
      input,
      contextManager: {
        callKibanaApi,
        getContext: () => ({ workflow: { spaceId: SPACE } }),
        getFakeRequest: () => ({}),
      },
    } as unknown as StepHandlerContext<unknown, unknown>);
  return {
    service,
    management,
    callKibanaApi,
    group: async (input: Record<string, unknown>) =>
      (await definition(getTriageGroupFpCandidatesStepDefinition).handler(context(input)))
        .output as unknown as StepOutput,
    join: async (input: Record<string, unknown>) =>
      (await definition(getTriageJoinProposalStepDefinition as never).handler(context(input)))
        .output as unknown as StepOutput,
  };
};

describe('triage group false positives step', () => {
  it.each([
    ['at supervised autonomy', { autonomy: 'supervised' as const }, true, 'supervised'],
    ['when the kill switch is off', {}, false, 'flag_off'],
  ])(
    'mints one proposal under a random id and reads no proposals %s',
    async (_, input, enabled, grouping) => {
      const { group, service } = setup({ heads: [openHead()], groupingEnabled: enabled });

      const output = await group({ ...baseInput, ...input, fp_candidate_ids: ['a1', 'a2'] });

      expect(service.list).not.toHaveBeenCalled();
      expect(output).toEqual(
        expect.objectContaining({ grouped: false, grouping, joins: [], proposals_created: 1 })
      );
      expect(output.mints).toEqual([
        expect.objectContaining({ kind: 'batch', alert_ids: ['a1', 'a2'] }),
      ]);
      expect(output.mints[0].proposal_id).not.toBe(GEN0);
    }
  );

  it('joins the open proposal of the pattern, with a comment that counts the union', async () => {
    const { group, service } = setup({ heads: [openHead()] });

    const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

    expect(service.revise).toHaveBeenCalledWith(
      expect.objectContaining({
        id: GEN0,
        title: expect.stringContaining('3 alerts'),
        actionInput: { alertIds: ['old-1', 'a1', 'a2'] },
      }),
      SPACE,
      expect.anything()
    );
    expect(output).toEqual(
      expect.objectContaining({
        grouped: true,
        grouping: 'on',
        mints: [],
        alerts_joined: 2,
        joins: [
          {
            owner_proposal_id: GEN0,
            proposal_id: 'revision-id',
            revision: 2,
            conversation_id: 'conv-owner',
            alert_ids: ['a1', 'a2'],
            alerts_page_query: expect.stringContaining('filters='),
            impacted_entities: [],
          },
        ],
      })
    );
  });

  it('does not join a proposal whose gate no longer waits, and starts the next generation', async () => {
    const { group, service } = setup({
      heads: [openHead()],
      gateStatus: ExecutionStatus.RUNNING,
    });

    const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

    expect(service.revise).not.toHaveBeenCalled();
    expect(output.mints).toEqual([expect.objectContaining({ proposal_id: GEN1, kind: 'keyed' })]);
  });

  it('does not join a proposal whose Investigation is closed', async () => {
    const { group, service } = setup({ heads: [openHead()], investigationStatus: 'closed' });

    const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

    expect(service.revise).not.toHaveBeenCalled();
    expect(output.mints[0].proposal_id).toBe(GEN1);
  });

  describe('earlier verdicts of the pattern', () => {
    it('tells the reviewer when the pattern was a true positive before, excluding the alerts themselves', async () => {
      const { group, callKibanaApi } = setup({ history: { falsePositive: 9, truePositive: 3 } });

      const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

      expect(output.mints[0].comment).toContain(
        '12 earlier alerts with the same pattern in the last 30 days: 9 false positive, 3 true positive'
      );
      const historyCall = callKibanaApi.mock.calls
        .map(([call]) => call.body)
        .find((body) => body.aggs?.verdicts);
      expect(historyCall.query.bool.must_not).toEqual([{ ids: { values: ['a1', 'a2'] } }]);
      expect(historyCall.query.bool.filter[0].terms['kibana.alert.workflow_tags']).toEqual([
        expect.stringMatching(/^az:triage_strict_key:/),
      ]);
    });

    it('says nothing when the pattern was only ever a false positive', async () => {
      const { group } = setup({ history: { falsePositive: 9, truePositive: 0 } });

      const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

      expect(output.mints[0].comment).not.toContain('earlier alert');
    });

    it('still raises the proposal when the history cannot be read', async () => {
      const { group } = setup({ history: 'fails' });

      const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

      expect(output.mints).toHaveLength(1);
      expect(output.mints[0].comment).not.toContain('earlier alert');
    });

    it('rebuilds the line on a join, counting the union without its own alerts', async () => {
      const { group, service } = setup({
        heads: [openHead()],
        history: { falsePositive: 1, truePositive: 2 },
      });

      await group({ ...baseInput, fp_candidate_ids: ['a1'] });

      expect(service.revise.mock.calls[0][0].comment).toContain(
        '3 earlier alerts with the same pattern in the last 30 days: 1 false positive, 2 true positive'
      );
    });
  });

  it('does not group a batch when the lookup returns fewer proposals than matched', async () => {
    const { group, service } = setup({ heads: [openHead()] });
    service.list.mockResolvedValue({ proposals: [openHead()], total: 3 });

    const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

    expect(service.revise).not.toHaveBeenCalled();
    // The batch must show as not grouped, not only in the log: telemetry and the summary read this.
    expect(output).toEqual(
      expect.objectContaining({ grouped: false, grouping: 'lookup_incomplete' })
    );
    expect(output.mints).toEqual([
      expect.objectContaining({ kind: 'overflow', alert_ids: ['a1', 'a2'] }),
    ]);
    expect(output.mints[0].proposal_id).not.toBe(GEN0);
  });

  it('tells the reviewer the alerts joined a proposal that failed to take them', async () => {
    const { group, service } = setup({ heads: [openHead()] });
    service.revise.mockRejectedValue(new Error('storage down'));

    const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

    expect(output.mints).toEqual([expect.objectContaining({ kind: 'failed_join' })]);
  });

  it('pools a lone alert that joins nothing', async () => {
    const { group } = setup();

    const output = await group({ ...baseInput, fp_candidate_ids: ['a1'] });

    expect(output).toEqual(expect.objectContaining({ alerts_pooled: 1, proposals_created: 1 }));
    expect(output.mints[0]).toEqual(expect.objectContaining({ kind: 'pooled' }));
  });
});

describe('triage join proposal step', () => {
  const input = { ...baseInput, proposal_id: GEN0, alert_ids: ['a1'] };

  it('joins the proposal the failed create collided with', async () => {
    const { join, service } = setup({ heads: [openHead()] });

    const output = await join(input);

    expect(service.list.mock.calls[0][0].rootProposalIds).toEqual([GEN0]);
    expect(output).toEqual({
      joined: true,
      proposal_id: 'revision-id',
      conversation_id: 'conv-owner',
      revision: 2,
      alert_ids: ['a1'],
      alerts_page_query: expect.stringContaining('filters='),
    });
  });

  it('joins without a revise when the proposal already holds the alerts', async () => {
    const { join, service } = setup({ heads: [openHead({ actionInput: { alertIds: ['a1'] } })] });

    const output = await join(input);

    expect(service.revise).not.toHaveBeenCalled();
    expect(output).toEqual(
      expect.objectContaining({ joined: true, alert_ids: [], alerts_page_query: '' })
    );
  });

  it('does not join when the kill switch is off, so the review keeps its own failure path', async () => {
    const { join, service } = setup({ heads: [openHead()], groupingEnabled: false });

    const output = await join(input);

    expect(service.revise).not.toHaveBeenCalled();
    expect(output.joined).toBe(false);
  });

  it('fails when it cannot find the proposal yet, so the review retries it', async () => {
    const { join } = setup();

    await expect(join(input)).rejects.toThrow('not searchable yet');
  });

  it('does not join a proposal that cannot take the alerts, which a retry would not change', async () => {
    const { join, service } = setup({ heads: [openHead({ status: 'succeeded' })] });

    const output = await join(input);

    expect(service.revise).not.toHaveBeenCalled();
    expect(output.joined).toBe(false);
  });
});
