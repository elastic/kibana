/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { HUNT_COVERAGE_AI_INDEX_DEST } from '../../../common/step_types/package_report';
import { groupByStrictKey, strictKeyTag } from '../../alert_triage/fp_decisions';
import { getTriageStoreFpDecisionsStepDefinition } from './store_fp_decisions_step';

const processSource = (executable: string) => ({
  'kibana.alert.rule.uuid': 'rule-1',
  'kibana.alert.rule.name': 'Rule One',
  'kibana.alert.rule.revision': 3,
  host: { os: { type: 'windows' } },
  process: { executable, code_signature: { subject_name: 'Acme' } },
});

/** `count` alerts per executable: [['a.exe', 3]] gives alerts a.exe-0 .. a.exe-2. */
const alertsOf = (executables: Array<[string, number]>) =>
  executables.flatMap(([executable, count]) =>
    Array.from({ length: count }, (_, index) => ({
      _id: `${executable}-${index}`,
      _source: processSource(executable),
    }))
  );

const hashOf = (executable: string) =>
  groupByStrictKey({
    alerts: [{ id: 'x', doc: processSource(executable) }],
    spaceId: 'default',
  }).groups[0].hash;

const setup = ({
  alerts,
  keysWithVerdicts = [],
  enabled = true,
  bulkResponse = { errors: false, items: [] as unknown[] },
  searchFails = false,
}: {
  alerts: Array<{ _id: string; _source: Record<string, unknown> }>;
  keysWithVerdicts?: string[];
  enabled?: boolean;
  bulkResponse?: { errors: boolean; items: unknown[] };
  searchFails?: boolean;
}) => {
  const callKibanaApi = jest.fn(async ({ body }: { body: { aggs?: unknown; query?: unknown } }) => {
    if (body.aggs) {
      if (searchFails) throw new Error('search failed');
      return {
        body: {
          aggregations: {
            keys: { buckets: keysWithVerdicts.map((exe) => ({ key: strictKeyTag(hashOf(exe)) })) },
          },
        },
      };
    }
    return { body: { hits: { hits: alerts } } };
  });
  const bulk = jest.fn(async () => bulkResponse);
  const isContextEngineEnabled = jest.fn(async () => enabled);
  const run = (input: Record<string, unknown>) =>
    getTriageStoreFpDecisionsStepDefinition({ isContextEngineEnabled }).handler({
      input: {
        outcome: 'approved',
        alert_ids: alerts.map(({ _id }) => _id),
        space_id: 'default',
        autonomy: 'manual',
        proposal_id: 'proposal-1',
        investigation_id: 'conversation-1',
        approver: 'analyst',
        ...input,
      },
      contextManager: {
        callKibanaApi,
        getFakeRequest: () => ({}),
        getScopedEsClient: () => ({ bulk }),
      },
      logger: { warn: jest.fn() },
    } as unknown as StepHandlerContext<unknown, unknown>);
  return { run, callKibanaApi, bulk, isContextEngineEnabled };
};

const written = (bulk: jest.Mock) =>
  (bulk.mock.calls[0] as unknown as [{ operations: Array<Record<string, any>> }])[0].operations;

describe('triage store decisions step', () => {
  it('stores one decision per exact pattern with enough approved alerts, under an id from the key', async () => {
    const { run, bulk } = setup({
      alerts: alertsOf([
        ['a.exe', 3],
        ['b.exe', 2],
      ]),
    });

    const { output } = await run({});

    expect(output).toEqual(
      expect.objectContaining({
        skip_reason: 'none',
        written: 1,
        keys_seen: 2,
        keys_below_minimum: 1,
      })
    );
    const [action, doc] = written(bulk);
    expect(action.index).toEqual({
      _index: HUNT_COVERAGE_AI_INDEX_DEST.value,
      _id: `fp-decision-${hashOf('a.exe')}`,
    });
    expect(doc).toEqual(
      expect.objectContaining({
        type: 'security.fp_decision',
        id: `fp-decision-${hashOf('a.exe')}`,
      })
    );
  });

  it('stores nothing for a key that has an earlier true positive or inconclusive alert', async () => {
    const { run, bulk } = setup({
      alerts: alertsOf([
        ['a.exe', 3],
        ['b.exe', 3],
      ]),
      keysWithVerdicts: ['a.exe'],
    });

    const { output } = await run({});

    expect(output).toEqual(expect.objectContaining({ written: 1, keys_with_other_verdicts: 1 }));
    expect(written(bulk)[0].index._id).toBe(`fp-decision-${hashOf('b.exe')}`);
  });

  it('looks up the verdicts of only the keys that are big enough', async () => {
    const { run, callKibanaApi } = setup({
      alerts: alertsOf([
        ['a.exe', 3],
        ['b.exe', 1],
      ]),
    });

    await run({});

    const lookup = callKibanaApi.mock.calls.find(([{ body }]) => body.aggs)![0].body;
    expect(JSON.stringify(lookup.query)).toContain(strictKeyTag(hashOf('a.exe')));
    expect(JSON.stringify(lookup.query)).not.toContain(strictKeyTag(hashOf('b.exe')));
  });

  it('writes nothing when the verdict lookup fails, instead of guessing', async () => {
    const { run, bulk } = setup({ alerts: alertsOf([['a.exe', 3]]), searchFails: true });

    const { output } = await run({});

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'storage_failure', written: 0 }));
    expect(bulk).not.toHaveBeenCalled();
  });

  it('stores nothing for a supervised approval, which nobody looked at', async () => {
    const { run, bulk, callKibanaApi } = setup({ alerts: alertsOf([['a.exe', 3]]) });

    const { output } = await run({ autonomy: 'supervised' });

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'supervised', written: 0 }));
    expect(bulk).not.toHaveBeenCalled();
    expect(callKibanaApi).not.toHaveBeenCalled();
  });

  it('stores nothing while the Context Engine is off, without reading any alert', async () => {
    const { run, bulk, callKibanaApi } = setup({
      alerts: alertsOf([['a.exe', 3]]),
      enabled: false,
    });

    const { output } = await run({});

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'disabled' }));
    expect(bulk).not.toHaveBeenCalled();
    expect(callKibanaApi).not.toHaveBeenCalled();
  });

  it('does not fail the run when the setting cannot be read', async () => {
    const { run, isContextEngineEnabled } = setup({ alerts: alertsOf([['a.exe', 3]]) });
    isContextEngineEnabled.mockRejectedValueOnce(new Error('saved objects down'));

    const { output } = await run({});

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'storage_failure' }));
  });

  it('reports denied when the worker may not write the index', async () => {
    const forbidden = { errors: true, items: [{ index: { status: 403, error: { type: 'x' } } }] };
    const { run } = setup({ alerts: alertsOf([['a.exe', 3]]), bulkResponse: forbidden });

    const { output } = await run({});

    expect(output).toEqual(
      expect.objectContaining({ skip_reason: 'denied', written: 0, failed: 1 })
    );
  });

  it.each([429, 503])(
    'reports a storage failure when every write fails with %i',
    async (status) => {
      const failing = { errors: true, items: [{ index: { status, error: { type: 'x' } } }] };
      const { run } = setup({ alerts: alertsOf([['a.exe', 3]]), bulkResponse: failing });

      const { output } = await run({});

      expect(output).toEqual(
        expect.objectContaining({ skip_reason: 'storage_failure', written: 0, failed: 1 })
      );
    }
  );

  it('counts the decisions that failed and those that were stored', async () => {
    const partial = {
      errors: true,
      items: [{ index: { status: 201 } }, { index: { status: 500, error: { type: 'x' } } }],
    };
    const { run } = setup({
      alerts: alertsOf([
        ['a.exe', 3],
        ['b.exe', 3],
      ]),
      bulkResponse: partial,
    });

    const { output } = await run({});

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'none', written: 1, failed: 1 }));
  });

  it('stores no decision for alerts with no strict key', async () => {
    const cloud = Array.from({ length: 4 }, (_, index) => ({
      _id: `c-${index}`,
      _source: { 'kibana.alert.rule.uuid': 'cloud-rule', user: { name: 'u' } },
    }));
    const { run, bulk } = setup({ alerts: cloud });

    const { output } = await run({});

    expect(output).toEqual(
      expect.objectContaining({ skip_reason: 'no_strict_keys', alerts_without_strict_key: 4 })
    );
    expect(bulk).not.toHaveBeenCalled();
  });

  it('stores a dismissed pattern as do-not-propose, with no minimum and no verdict lookup', async () => {
    const { run, bulk, callKibanaApi } = setup({ alerts: alertsOf([['a.exe', 1]]) });

    const { output } = await run({ outcome: 'dismissed' });

    expect(output).toEqual(expect.objectContaining({ written: 1 }));
    expect(written(bulk)[0].index._id).toBe(`fp-dismissal-${hashOf('a.exe')}`);
    expect(written(bulk)[1].attributes.decision).toBe('do_not_propose');
    expect(callKibanaApi.mock.calls.some(([{ body }]) => body.aggs)).toBe(false);
  });
});
