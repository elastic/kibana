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
// The step reads the clock for the day of the ids, so the clock is fixed for the whole file.
const NOW = Date.parse('2026-10-26T12:00:00Z');
const [GEN0, GEN1] = generationIds(SPACE, KEY_HASH, NOW);

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
  source = ALERT as Record<string, unknown>,
  history = { falsePositive: 0, truePositive: 0 } as
    | { falsePositive: number; truePositive: number }
    | 'fails',
} = {}) => {
  const logger = { warn: jest.fn() };
  const privileges = {
    assertCanRead: jest.fn(),
    assertCanManage: jest.fn(),
  };
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
            _source: source,
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
          getProposalPrivileges: () => privileges,
        } as never),
      getWorkflowsManagement: () => management as never,
      getConversations: () =>
        ({
          getScopedClient: async () => ({
            get: async () => ({ metadata: { status: investigationStatus } }),
          }),
        } as never),
      isGroupingEnabled: async () => groupingEnabled,
      logger: logger as never,
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
    logger,
    service,
    privileges,
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

beforeAll(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterAll(() => {
  jest.restoreAllMocks();
});

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

  it('returns only the inconclusive link for a batch with no candidates, without grouping', async () => {
    const { group, service } = setup({ heads: [openHead()] });

    const output = await group({
      ...baseInput,
      fp_candidate_ids: [],
      inconclusive_alert_ids: ['i1'],
    });

    expect(output).toEqual(
      expect.objectContaining({
        mints: [],
        joins: [],
        inconclusive_alerts_page_query: expect.stringContaining('filters='),
      })
    );
    expect(service.revise).not.toHaveBeenCalled();
  });

  describe('the entities of the alerts in no proposal', () => {
    const run = (source: Record<string, unknown>) => {
      const { group } = setup({ heads: [], source });
      return group({
        ...baseInput,
        fp_candidate_ids: [],
        other_alert_ids: ['a1'],
        impacted_entities: [
          { id: 'host:h1', name: 'h1', type: 'host' },
          { id: 'host:host-id-2', name: 'h2', type: 'host' },
          { id: 'user:u1', name: 'u1', type: 'user' },
        ],
      });
    };

    it('names them even for a batch with no candidates', async () => {
      expect(await run({ host: { name: 'h1' }, user: { name: 'u1' } })).toEqual(
        expect.objectContaining({
          other_impacted_entities: [
            { id: 'host:h1', name: 'h1', type: 'host' },
            { id: 'user:u1', name: 'u1', type: 'user' },
          ],
        })
      );
    });

    // Alert Analysis names a host by host.id when it has one, so the id is what has to match.
    it('matches a host by its id, which Alert Analysis prefers to the name', async () => {
      expect(await run({ host: { id: 'host-id-2', name: 'h2' } })).toEqual(
        expect.objectContaining({
          other_impacted_entities: [{ id: 'host:host-id-2', name: 'h2', type: 'host' }],
        })
      );
    });

    it('does not mix up two hosts that share a display name', async () => {
      expect(await run({ host: { id: 'another-id', name: 'h1' } })).toEqual(
        expect.objectContaining({ other_impacted_entities: [] })
      );
    });
  });

  it('requires manage_proposals before it revises a proposal', async () => {
    const { group, privileges } = setup({ heads: [openHead()] });

    await group({ ...baseInput, fp_candidate_ids: ['a1'] });

    expect(privileges.assertCanManage).toHaveBeenCalled();
    expect(privileges.assertCanRead).toHaveBeenCalled();
  });

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
            total_alerts: 3,
            // The tag, not the ids, so the link stays the same size for a proposal of 1,000 alerts.
            alerts_page_query: expect.stringContaining(`az:proposal:${GEN0}`),
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

  it('logs a warning when a pattern has used every proposal id it can mint today', async () => {
    const used = generationIds(SPACE, KEY_HASH, NOW).map((id) =>
      openHead({ id, rootProposalId: id, status: 'expired' })
    );
    const { group, logger } = setup({ heads: used });

    const output = await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

    expect(output.mints).toEqual([expect.objectContaining({ kind: 'overflow' })]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('2 alert(s)'));
  });

  it('does not repeat the lookup warning when the proposal lookup was incomplete', async () => {
    const { group, service, logger } = setup({ heads: [openHead()] });
    service.list.mockResolvedValue({ proposals: [openHead()], total: 3 });

    await group({ ...baseInput, fp_candidate_ids: ['a1', 'a2'] });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('proposal lookup'));
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

  it('fails while the owner is still starting its gate, so the review retries it', async () => {
    const { join, service } = setup({
      heads: [openHead()],
      gateStatus: ExecutionStatus.RUNNING,
    });

    await expect(join(input)).rejects.toThrow('has not reached its gate yet');
    expect(service.revise).not.toHaveBeenCalled();
  });

  it('does not fail for a gate that is running because the proposal was already decided', async () => {
    const { join } = setup({
      heads: [openHead({ decision: 'approved', status: 'approved' })],
      gateStatus: ExecutionStatus.RUNNING,
    });

    expect((await join(input)).joined).toBe(false);
  });

  it('does not join a proposal that cannot take the alerts, which a retry would not change', async () => {
    const { join, service } = setup({ heads: [openHead({ status: 'succeeded' })] });

    const output = await join(input);

    expect(service.revise).not.toHaveBeenCalled();
    expect(output.joined).toBe(false);
  });
});
