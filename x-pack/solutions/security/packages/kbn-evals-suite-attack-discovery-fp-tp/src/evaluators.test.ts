/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import {
  claimGrounding,
  createFpTpTrajectoryEvaluator,
  outcomeAccuracy,
  payloadConformance,
  skipFailedRuns,
  unsafeClose,
} from './evaluators';
import type { FpTpOutcome } from './constants';
import type { FpTpTaskOutput } from './workflow_task';

const completed: FpTpTaskOutput = {
  executionId: 'exec-1',
  executionStatus: ExecutionStatus.COMPLETED,
  outcome: 'false_positive',
  payload: { verdict: 'false_positive', summary_markdown: 'A summary' },
  attackDiscoveryIdEcho: 'ad-1',
  seededIds: { attackDiscoveryId: 'ad-1', alertIds: [], entityIds: [], eventIds: [] },
  seededEvidence: { alerts: [], entities: [], events: [] },
  agentConversationIds: [],
  toolCallIds: [],
  toolCallsUnavailable: false,
};

const failed: FpTpTaskOutput = {
  ...completed,
  executionStatus: ExecutionStatus.FAILED,
  outcome: 'failed',
  payload: undefined,
  attackDiscoveryIdEcho: undefined,
};

const score = async (
  evaluator: Evaluator,
  output: FpTpTaskOutput,
  gold: FpTpOutcome
): Promise<number | null | undefined> =>
  (await evaluator.evaluate({ input: {}, output, expected: { outcome: gold }, metadata: {} }))
    .score;

describe('OutcomeAccuracy', () => {
  it('returns 1 when the outcome matches the gold', async () => {
    expect(await score(outcomeAccuracy, completed, 'false_positive')).toBe(1);
  });

  it('returns 0 when the outcome differs from the gold', async () => {
    expect(await score(outcomeAccuracy, completed, 'inconclusive')).toBe(0);
  });

  it('returns 1 for a failed run whose gold is failed', async () => {
    expect(await score(outcomeAccuracy, failed, 'failed')).toBe(1);
  });

  it.each([ExecutionStatus.TIMED_OUT, ExecutionStatus.CANCELLED, ExecutionStatus.RUNNING])(
    'returns 0 for a %s run whose gold is failed',
    async (executionStatus) => {
      expect(await score(outcomeAccuracy, { ...failed, executionStatus }, 'failed')).toBe(0);
    }
  );

  it('returns 0 for a run with no outcome', async () => {
    expect(await score(outcomeAccuracy, { ...completed, outcome: undefined }, 'inconclusive')).toBe(
      0
    );
  });
});

describe('UnsafeClose', () => {
  it.each<FpTpOutcome>(['true_positive', 'inconclusive', 'failed'])(
    'returns 0 for false_positive when the gold is %s',
    async (gold) => {
      expect(await score(unsafeClose, completed, gold)).toBe(0);
    }
  );

  it('returns 1 for false_positive when the gold is false_positive', async () => {
    expect(await score(unsafeClose, completed, 'false_positive')).toBe(1);
  });

  it('returns 1 for inconclusive when the gold is true_positive', async () => {
    expect(
      await score(unsafeClose, { ...completed, outcome: 'inconclusive' }, 'true_positive')
    ).toBe(1);
  });
});

describe('PayloadConformance', () => {
  it('returns 1 for a conforming payload', async () => {
    expect(await score(payloadConformance, completed, 'false_positive')).toBe(1);
  });

  it.each<[string, Partial<FpTpTaskOutput>]>([
    ['an unsupported verdict', { payload: { verdict: 'failed', summary_markdown: 'A summary' } }],
    ['an empty summary', { payload: { verdict: 'inconclusive', summary_markdown: ' ' } }],
    [
      'an oversized summary',
      { payload: { verdict: 'inconclusive', summary_markdown: 'x'.repeat(8001) } },
    ],
    [
      'an oversized rationale',
      {
        payload: {
          verdict: 'inconclusive',
          summary_markdown: 'A summary',
          rationale_markdown: 'x'.repeat(50001),
        },
      },
    ],
    ['a different attack id echo', { attackDiscoveryIdEcho: 'ad-2' }],
    ['a conforming payload from a failed execution', { executionStatus: ExecutionStatus.FAILED }],
    ['no payload', { payload: undefined }],
  ])('returns 0 for %s', async (_, overrides) => {
    expect(await score(payloadConformance, { ...completed, ...overrides }, 'inconclusive')).toBe(0);
  });

  it('returns 1 for a run that should fail and produced no payload', async () => {
    expect(await score(payloadConformance, failed, 'failed')).toBe(1);
  });

  it('returns 0 for a run that should fail but produced a payload', async () => {
    expect(await score(payloadConformance, completed, 'failed')).toBe(0);
  });

  it('returns 0 for a run that should fail but completed without a payload', async () => {
    expect(
      await score(
        payloadConformance,
        { ...failed, executionStatus: ExecutionStatus.COMPLETED, outcome: undefined },
        'failed'
      )
    ).toBe(0);
  });

  it.each([ExecutionStatus.TIMED_OUT, ExecutionStatus.CANCELLED, ExecutionStatus.RUNNING])(
    'returns 0 for a run that should fail but ended %s',
    async (executionStatus) => {
      expect(await score(payloadConformance, { ...failed, executionStatus }, 'failed')).toBe(0);
    }
  );
});

describe('trajectory', () => {
  const trajectory = createFpTpTrajectoryEvaluator();

  it('returns 1 when the agent called no tools', async () => {
    expect(await score(trajectory, completed, 'false_positive')).toBe(1);
  });

  it('returns less than 1 when the agent called a tool', async () => {
    expect(
      await score(trajectory, { ...completed, toolCallIds: ['search'] }, 'false_positive')
    ).toBeLessThan(1);
  });

  it('returns N/A when traces are unavailable', async () => {
    expect(
      await score(trajectory, { ...completed, toolCallsUnavailable: true }, 'false_positive')
    ).toBeNull();
  });
});

describe('skipFailedRuns', () => {
  const inner: Evaluator = {
    name: 'Criteria',
    kind: 'LLM',
    direction: 'maximize',
    evaluate: jest.fn().mockResolvedValue({ score: 0.5 }),
  };
  const wrapped = skipFailedRuns(inner);

  it('returns N/A for a failed run', async () => {
    expect(await score(wrapped, failed, 'failed')).toBeNull();
  });

  it('returns the inner score for a completed run', async () => {
    expect(await score(wrapped, completed, 'false_positive')).toBe(0.5);
  });
});

describe('ClaimGrounding', () => {
  const groundedRun = (overrides: Partial<FpTpTaskOutput> = {}): FpTpTaskOutput => ({
    ...completed,
    outcome: 'false_positive',
    payload: { verdict: 'false_positive', summary_markdown: 'A summary' },
    raw: {
      coverage: {
        alerts: { seen: 1, cap: 10, truncated: false },
        entities: { seen: 2, cap: 10, truncated: false },
        events: { seen: 3, cap: 10, truncated: false },
      },
      checks: [
        { name: 'entity_role', status: 'completed', result: 'contradicts', details: 'd' },
        { name: 'process_parent', status: 'completed', result: 'contradicts', details: 'd' },
        { name: 'network_destination', status: 'completed', result: 'contradicts', details: 'd' },
        { name: 'alert_linkage', status: 'completed', result: 'supports', details: 'd' },
      ],
      claims: {
        world: [
          { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
          { check: 'process_parent', result: 'contradicts', source: 'raw_event', id: 'ev-1' },
        ],
      },
    },
    seededEvidence: {
      alerts: [
        { id: 'alert-1', source: { host: { name: 'web-01' } } },
        { id: 'alert-2', source: { 'host.name': 'web-01' } },
      ],
      entities: [{ id: 'ent-1', source: { entity: { id: 'ent-1' } } }],
      events: [{ id: 'ev-1', source: { message: 'm' } }],
    },
    ...overrides,
  });

  it('scores 1 when every world claim is grounded', async () => {
    expect(await score(claimGrounding, groundedRun(), 'false_positive')).toBe(1);
  });

  it('scores 0 when an entity_store claim cites an unseeded id', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'nope' },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('not in the seeded entity_store');
  });

  it('scores 0 when a raw_event claim cites an unseeded id', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'process_parent', result: 'contradicts', source: 'raw_event', id: 'nope' },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('not in the seeded raw_event');
  });

  it('scores 0 when a claim result contradicts raw.checks', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'supports', source: 'entity_store', id: 'ent-1' },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('contradicts raw.checks');
  });

  it('scores 1 when the alert link pivots both alerts, nested and flattened', async () => {
    const run = groundedRun({
      raw: {
        ...groundedRun().raw!,
        claims: {
          world: [
            { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
          ],
          alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'alert-2'] },
        },
      },
    });
    expect(await score(claimGrounding, run, 'false_positive')).toBe(1);
  });

  it('scores 0 when an alert link cites an unseeded alert', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
            ],
            alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'ghost'] },
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('"ghost" not seeded');
  });

  it('scores 0 when an alert does not carry the pivot field value', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
            ],
            alert_link: {
              field: 'host.name',
              value: 'other-01',
              alert_ids: ['alert-1', 'alert-2'],
            },
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('does not carry host.name');
  });

  it('scores 0 when an alert link lists fewer than 2 alerts', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
            ],
            alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1'] },
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('fewer than 2 alert_ids');
  });

  it('scores N/A for an inconclusive verdict with no claims', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        outcome: 'inconclusive',
        payload: { verdict: 'inconclusive', summary_markdown: 'A summary' },
        raw: { coverage: { entities: { seen: 2, cap: 10, truncated: false } }, claims: {} },
      }),
      expected: { outcome: 'inconclusive' },
      metadata: {},
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('validates claims for an inconclusive verdict instead of returning N/A', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        outcome: 'inconclusive',
        payload: { verdict: 'inconclusive', summary_markdown: 'A summary' },
        raw: {
          ...groundedRun().raw!,
          // Every world check skipped-or-neutral; the run still emits an
          // alert_link claim citing an unseeded alert, which must be scored.
          checks: (
            groundedRun().raw!.checks as Array<{ name?: string; status?: string; result?: string }>
          ).map((check) =>
            check.name === 'alert_linkage'
              ? { ...check, status: 'completed', result: 'supports' }
              : { ...check, status: 'skipped', result: 'neutral' }
          ),
          claims: {
            alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'ghost'] },
          },
        },
      }),
      expected: { outcome: 'inconclusive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe('ungrounded');
    expect(result.explanation).toContain('"ghost" not seeded');
  });

  it('scores 1 for an inconclusive verdict whose emitted claim is grounded', async () => {
    const run = groundedRun({
      outcome: 'inconclusive',
      payload: { verdict: 'inconclusive', summary_markdown: 'A summary' },
      raw: {
        ...groundedRun().raw!,
        claims: {
          world: [
            { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
          ],
        },
      },
    });
    expect(await score(claimGrounding, run, 'inconclusive')).toBe(1);
  });

  it('scores N/A for a truncation downgrade that omits claims', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        outcome: 'inconclusive',
        payload: { verdict: 'inconclusive', summary_markdown: 'A summary' },
        raw: {
          coverage: { entities: { seen: 2, cap: 10, truncated: true } },
          claims: undefined,
        },
      }),
      expected: { outcome: 'inconclusive' },
      metadata: {},
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('returns N/A when there is no payload', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: { ...groundedRun(), payload: undefined },
      expected: { outcome: 'failed' },
      metadata: {},
    });
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('scores 0 for a TP with only an alert_link claim and empty claims.world', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        outcome: 'true_positive',
        payload: { verdict: 'true_positive', summary_markdown: 'A summary' },
        raw: {
          ...groundedRun().raw!,
          checks: (
            groundedRun().raw!.checks as Array<{ name?: string; status?: string; result?: string }>
          ).map((check) =>
            check.name === 'alert_linkage' ? { ...check, result: 'neutral' } : check
          ),
          claims: {
            alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'alert-2'] },
          },
        },
      }),
      expected: { outcome: 'true_positive' },
      metadata: {},
    });
    // The link cannot stand in for world claims: alert_linkage does not support
    // it, and entity_role/alert_linkage alone never suffice for true_positive.
    expect(result.score).toBe(0);
    expect(result.label).toBe('ungrounded');
  });

  it('scores 0 with label missing-claims for a TP with empty claims.world', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        outcome: 'true_positive',
        payload: { verdict: 'true_positive', summary_markdown: 'A summary' },
        raw: { coverage: {}, claims: {} },
      }),
      expected: { outcome: 'true_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.label).toBe('missing-claims');
  });

  it('scores partial when some claims are grounded', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'nope' },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0.5);
  });

  it('grounds a pivot on an array-valued field by membership', async () => {
    const run = groundedRun({
      seededEvidence: {
        ...groundedRun().seededEvidence,
        alerts: [
          { id: 'alert-1', source: { host: { name: ['web-01', 'app-02'] } } },
          { id: 'alert-2', source: { 'host.name': ['web-01'] } },
        ],
      },
      raw: {
        ...groundedRun().raw!,
        claims: {
          world: [
            { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
          ],
          alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'alert-2'] },
        },
      },
    });
    expect(await score(claimGrounding, run, 'false_positive')).toBe(1);
  });

  it('grounds a numeric process.pid pivot against a string claim', async () => {
    const run = groundedRun({
      raw: {
        ...groundedRun().raw!,
        claims: {
          world: [
            { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
          ],
          alert_link: { field: 'process.pid', value: '4242', alert_ids: ['alert-1', 'alert-2'] },
        },
      },
      seededEvidence: {
        ...groundedRun().seededEvidence,
        alerts: [
          { id: 'alert-1', source: { process: { pid: 4242 } } },
          { id: 'alert-2', source: { 'process.pid': 4242 } },
        ],
      },
    });
    expect(await score(claimGrounding, run, 'false_positive')).toBe(1);
  });

  it('scores 0 when alert_link is claimed but raw.checks alert_linkage does not support', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          checks: (
            groundedRun().raw!.checks as Array<{ name?: string; status?: string; result?: string }>
          ).map((check) =>
            check.name === 'alert_linkage' ? { ...check, result: 'neutral' } : check
          ),
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
            ],
            alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'alert-2'] },
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain(
      'alert_linkage in raw.checks is "neutral" (status "completed"), not "completed" + "supports"'
    );
  });

  it('scores 0 for an alert link grounded on a skipped alert_linkage check', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          // A skipped check carries no fresh result; a stale/defaulted `supports`
          // must not ground the link.
          checks: (
            groundedRun().raw!.checks as Array<{ name?: string; status?: string; result?: string }>
          ).map((check) =>
            check.name === 'alert_linkage' ? { ...check, status: 'skipped' } : check
          ),
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
            ],
            alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'alert-2'] },
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain(
      'alert_linkage in raw.checks is "supports" (status "skipped"), not "completed" + "supports"'
    );
  });

  it('scores 0 when an entity id grounds a process_parent claim (wrong source)', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              // ent-1 is a seeded entity id, but process_parent may only cite
              // raw event hits.
              {
                check: 'process_parent',
                result: 'contradicts',
                source: 'entity_store',
                id: 'ent-1',
              },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain(
      'check "process_parent" may only cite raw_event evidence, not entity_store'
    );
  });

  it('scores 0 when a raw event id grounds an entity_role claim (wrong source)', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              // ev-1 is a seeded raw event id, but entity_role may only cite
              // entity store hits.
              { check: 'entity_role', result: 'contradicts', source: 'raw_event', id: 'ev-1' },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain(
      'check "entity_role" may only cite entity_store evidence, not raw_event'
    );
  });

  it('grounds an entity claim on entity.id, not the document _id', async () => {
    // The seeded entity's document _id differs from its _source.entity.id; only
    // entity.id may ground the claim.
    const run = groundedRun({
      seededEvidence: {
        ...groundedRun().seededEvidence,
        entities: [{ id: 'doc-1', source: { entity: { id: 'ent-1' } } }],
      },
      raw: {
        ...groundedRun().raw!,
        claims: {
          world: [
            { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
          ],
        },
      },
    });
    expect(await score(claimGrounding, run, 'false_positive')).toBe(1);

    const byDocId = groundedRun({
      seededEvidence: {
        ...groundedRun().seededEvidence,
        entities: [{ id: 'doc-1', source: { entity: { id: 'ent-1' } } }],
      },
      raw: {
        ...groundedRun().raw!,
        claims: {
          world: [
            { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'doc-1' },
          ],
        },
      },
    });
    const result = await claimGrounding.evaluate({
      input: {},
      output: byDocId,
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('id "doc-1" not in the seeded entity_store');
  });

  it('scores 0 when an alert link cites the same valid alert id twice', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
            ],
            alert_link: { field: 'host.name', value: 'web-01', alert_ids: ['alert-1', 'alert-1'] },
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0.5);
    expect(result.explanation).toContain('alert_ids must cite at least two distinct alerts');
  });

  it('scores 0 for a world claim with no source', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: undefined, id: 'ent-1' },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('no source');
  });

  it('scores 0 for a world claim citing a skipped check', async () => {
    const result = await claimGrounding.evaluate({
      input: {},
      output: groundedRun({
        raw: {
          ...groundedRun().raw!,
          checks: (
            groundedRun().raw!.checks as Array<{ name?: string; status?: string; result?: string }>
          ).map((check) =>
            check.name === 'entity_role'
              ? { ...check, status: 'skipped', result: undefined }
              : check
          ),
          claims: {
            world: [
              { check: 'entity_role', result: 'contradicts', source: 'entity_store', id: 'ent-1' },
            ],
          },
        },
      }),
      expected: { outcome: 'false_positive' },
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.explanation).toContain('is skipped, so it has no result to cite');
  });
});
