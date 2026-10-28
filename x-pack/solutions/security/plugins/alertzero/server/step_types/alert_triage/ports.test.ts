/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ALERT_FETCH_LIMIT, BATCH_ALERT_CAP, RULE_FETCH_LIMIT } from '../../alert_triage/constants';
import {
  fetchTriageAlerts,
  listLiveExecutionIds,
  loadAlertsByIds,
  tagAlerts,
  type TriageFilters,
} from './ports';

const tagWith = (body: Record<string, unknown>) => {
  const callKibanaApi = jest.fn().mockResolvedValue({ status: 200, headers: {}, body });
  const tag = tagAlerts({ callKibanaApi });
  return {
    callKibanaApi,
    run: () => tag({ alertIds: ['a1', 'a2'], add: ['az:triage_pending'], remove: [] }),
  };
};

describe('tagAlerts', () => {
  it('sends the ids and tag changes to the detection-engine tags route', async () => {
    const { run, callKibanaApi } = tagWith({ updated: 2, timed_out: false, failures: [] });

    await run();

    expect(callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/detection_engine/signals/tags',
      body: { ids: ['a1', 'a2'], tags: { tags_to_add: ['az:triage_pending'], tags_to_remove: [] } },
    });
  });

  it('resolves when the update was applied in full', async () => {
    await expect(tagWith({ updated: 2, timed_out: false, failures: [] }).run()).resolves.toBe(
      undefined
    );
  });

  it('rejects a 200 whose update timed out, so an unstored claim is not reported as made', async () => {
    await expect(tagWith({ updated: 1, timed_out: true, failures: [] }).run()).rejects.toThrow(
      'not fully applied'
    );
  });

  it('rejects a 200 that carries failures, so an unstored release is not reported as made', async () => {
    await expect(
      tagWith({ updated: 1, timed_out: false, failures: [{ cause: { type: 'x' } }] }).run()
    ).rejects.toThrow('not fully applied');
  });
});

describe('tagAlerts on a version conflict', () => {
  const conflict = () =>
    new KibanaApiCallError({
      status: 409,
      headers: {},
      body: { version_conflicts: 1 },
      message: 'HTTP 409: version_conflict_engine_exception',
    });
  const ok = { status: 200, headers: {}, body: { updated: 2, timed_out: false, failures: [] } };
  const run = (callKibanaApi: jest.Mock) =>
    tagAlerts({ callKibanaApi })({ alertIds: ['a1', 'a2'], add: ['t'], remove: [] });

  it('repeats the call, so one alert another writer touched does not fail the sweep', async () => {
    const callKibanaApi = jest.fn().mockRejectedValueOnce(conflict()).mockResolvedValue(ok);

    await expect(run(callKibanaApi)).resolves.toBeUndefined();
    expect(callKibanaApi).toHaveBeenCalledTimes(2);
  });

  it('gives up after three attempts', async () => {
    const callKibanaApi = jest.fn().mockRejectedValue(conflict());

    await expect(run(callKibanaApi)).rejects.toThrow('version_conflict');
    expect(callKibanaApi).toHaveBeenCalledTimes(3);
  });

  it('does not repeat any other error', async () => {
    const callKibanaApi = jest
      .fn()
      .mockRejectedValue(
        new KibanaApiCallError({ status: 500, headers: {}, body: {}, message: 'HTTP 500' })
      );

    await expect(run(callKibanaApi)).rejects.toThrow('HTTP 500');
    expect(callKibanaApi).toHaveBeenCalledTimes(1);
  });
});

describe('listLiveExecutionIds', () => {
  it('lists the live execution ids of the batch workflow', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: { results: [{ id: 'e1' }, { id: 'e2' }] },
    });

    await expect(listLiveExecutionIds({ callKibanaApi }, 'batch')).resolves.toEqual(
      new Set(['e1', 'e2'])
    );
  });

  // The sweep treats an unreadable list as "unknown" and starts nothing, so a permission failure
  // would otherwise be indistinguishable from a transient one.
  it('logs why the live executions could not be read and reports them unknown', async () => {
    const callKibanaApi = jest.fn().mockRejectedValue(new Error('HTTP 403: Forbidden'));
    const logger = { warn: jest.fn() };

    await expect(listLiveExecutionIds({ callKibanaApi }, 'batch', logger)).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 403: Forbidden'));
  });
});

describe('loadAlertsByIds', () => {
  const loadWith = (hits: unknown[]) =>
    loadAlertsByIds(
      {
        callKibanaApi: jest
          .fn()
          .mockResolvedValue({ status: 200, headers: {}, body: { hits: { hits } } }),
      },
      ['a1', 'gone']
    );

  // Alert Analysis rejects an alert without a nested `kibana` object, and the alerts index
  // stores `kibana.*` as flat dotted keys, so every batch failed at classification.
  it('nests the dotted kibana keys Alert Analysis reads and keeps the nested ECS fields', async () => {
    const { alerts } = await loadWith([
      {
        _id: 'a1',
        _index: '.internal.alerts-security.alerts-default-000001',
        _source: {
          '@timestamp': '2026-10-12T12:00:00.000Z',
          'kibana.alert.rule.uuid': 'rule-1',
          'kibana.alert.rule.name': 'Rule one',
          'kibana.alert.severity': 'high',
          event: { code: '4688' },
        },
      },
    ]);

    expect(alerts).toEqual([
      {
        _id: 'a1',
        _index: '.internal.alerts-security.alerts-default-000001',
        '@timestamp': '2026-10-12T12:00:00.000Z',
        kibana: { alert: { rule: { uuid: 'rule-1', name: 'Rule one' }, severity: 'high' } },
        event: { code: '4688' },
      },
    ]);
  });

  it('reports the ids that could not be loaded', async () => {
    const { missingAlertIds } = await loadWith([{ _id: 'a1', _index: 'i', _source: {} }]);

    expect(missingAlertIds).toEqual(['gone']);
  });
});

const NO_FILTERS: TriageFilters = {
  minSeverity: 'low',
  excludeBuildingBlocks: false,
  excludedRuleTags: [],
};

describe('fetchTriageAlerts', () => {
  const hit = (id: string, ruleId: string, riskScore: number) => ({
    _id: id,
    _source: {
      '@timestamp': '2026-10-13T10:00:00.000Z',
      'kibana.alert.rule.uuid': ruleId,
      'kibana.alert.rule.name': `Rule ${ruleId}`,
      'kibana.alert.risk_score': riskScore,
      'kibana.alert.workflow_status': 'open',
      'kibana.alert.workflow_tags': [],
    },
  });

  const fetchWith = (
    rules: Array<{ hits: unknown[] }>,
    claimedHits: unknown[] = [],
    filters: Partial<TriageFilters> = {},
    excludedClaimHits: unknown[] = []
  ) => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ body }) => ({
      status: 200,
      headers: {},
      body: body.aggs
        ? {
            aggregations: {
              rules: { buckets: rules.map(({ hits }) => ({ top: { hits: { hits } } })) },
            },
          }
        : {
            hits: {
              // Only the excluded-claims search negates conditions, so `must_not` tells them apart.
              hits: JSON.stringify(body.query).includes('must_not')
                ? excludedClaimHits
                : claimedHits,
            },
          },
    }));
    return {
      callKibanaApi,
      run: () =>
        fetchTriageAlerts({ callKibanaApi }, 'alert_analysis:', Date.parse('2026-10-12'), {
          ...NO_FILTERS,
          ...filters,
        }),
    };
  };

  describe('detection of a rule that overrides the alert name', () => {
    const overridden = (source: Record<string, unknown>) => ({
      _id: 'd1',
      _source: {
        ...hit('d1', 'endpoint-rule', 50)._source,
        'kibana.alert.rule.rule_name_override': 'message',
        ...source,
      },
    });
    const detectionOf = async (alertHit: unknown) =>
      (await fetchWith([{ hits: [alertHit] }]).run())[0].detection;

    it('is the Defend rule.id', async () => {
      expect(await detectionOf(overridden({ 'rule.id': 'def-1', 'event.code': 'malware' }))).toBe(
        'def-1'
      );
    });

    it('falls back to event.code when rule.id is missing', async () => {
      expect(await detectionOf(overridden({ 'event.code': 'shellcode_thread' }))).toBe(
        'shellcode_thread'
      );
    });

    it('is absent for a rule without a name override, whatever the event carries', async () => {
      expect(
        await detectionOf({
          ...hit('d1', 'r', 1),
          _source: { ...hit('d1', 'r', 1)._source, 'rule.id': 'x' },
        })
      ).toBeUndefined();
    });
  });

  // One rule with a large backlog used to fill the single global top-10,000 result, so quieter
  // rules never reached the planner and its fair split had nothing to share out.
  it('reads the most urgent alerts of each rule, not one global top list', async () => {
    const { run, callKibanaApi } = fetchWith([{ hits: [] }]);

    await run();

    const unclaimed = callKibanaApi.mock.calls
      .map(([request]) => request.body)
      .find(({ aggs }) => aggs !== undefined);
    expect(unclaimed.size).toBe(0);
    expect(unclaimed.aggs.rules.terms).toEqual(
      expect.objectContaining({
        field: 'kibana.alert.rule.uuid',
        size: RULE_FETCH_LIMIT,
        order: [{ most_urgent_risk: 'desc' }, { oldest: 'asc' }],
      })
    );
    expect(unclaimed.aggs.rules.aggs.top.top_hits).toEqual(
      expect.objectContaining({
        size: BATCH_ALERT_CAP,
        sort: [{ 'kibana.alert.risk_score': 'desc' }, { '@timestamp': 'asc' }],
      })
    );
  });

  it('returns the alerts of every rule, then the claimed alerts', async () => {
    const { run } = fetchWith(
      [
        { hits: [hit('noisy-1', 'noisy', 90), hit('noisy-2', 'noisy', 89)] },
        { hits: [hit('quiet-1', 'quiet', 20)] },
      ],
      [hit('claimed-1', 'other', 10)]
    );

    const alerts = await run();

    expect(alerts.map(({ id, ruleId, riskScore }) => [id, ruleId, riskScore])).toEqual([
      ['noisy-1', 'noisy', 90],
      ['noisy-2', 'noisy', 89],
      ['quiet-1', 'quiet', 20],
      ['claimed-1', 'other', 10],
    ]);
  });

  it('keeps reading claimed alerts as one time-unbound search', async () => {
    const { run, callKibanaApi } = fetchWith([{ hits: [] }]);

    await run();

    const claimed = callKibanaApi.mock.calls
      .map(([request]) => request.body)
      .find(({ aggs }) => aggs === undefined);
    expect(claimed.size).toBe(ALERT_FETCH_LIMIT);
    expect(JSON.stringify(claimed.query)).toContain('az:triage_pending');
    expect(JSON.stringify(claimed.query)).not.toContain('range');
  });

  // A claim left by a failed or canceled batch is re-planned when its batch is gone. If the user has
  // since raised the severity floor or excluded the rule's tag, that must not start a new batch.
  it('flags a claimed alert the settings now exclude, and leaves the other claims alone', async () => {
    const stale = hit('claimed-low', 'rule-1', 10);
    const kept = hit('claimed-high', 'rule-2', 90);
    const { run, callKibanaApi } = fetchWith(
      [{ hits: [] }],
      [stale, kept],
      { minSeverity: 'high' },
      [stale]
    );

    const alerts = await run();

    expect(alerts.map(({ id, excludedBySettings }) => [id, excludedBySettings])).toEqual([
      ['claimed-low', true],
      ['claimed-high', undefined],
    ]);
    const excludedSearch = callKibanaApi.mock.calls
      .map(([request]) => request.body)
      .find(({ aggs, query }) => aggs === undefined && JSON.stringify(query).includes('must_not'));
    expect(excludedSearch.query.bool.filter).toContainEqual({
      term: { 'kibana.alert.workflow_tags': 'az:triage_pending' },
    });
    expect(excludedSearch.query.bool.must_not).toEqual([
      {
        bool: {
          filter: [{ terms: { 'kibana.alert.severity': ['high', 'critical'] } }],
          must_not: [],
        },
      },
    ]);
  });

  it('flags claims of excluded rule tags and building blocks the same way', async () => {
    const stale = hit('claimed-tagged', 'rule-1', 10);
    const { run } = fetchWith(
      [{ hits: [] }],
      [stale],
      { excludeBuildingBlocks: true, excludedRuleTags: ['in-development'] },
      [stale]
    );

    const [claimed] = await run();

    expect(claimed.excludedBySettings).toBe(true);
  });

  it('does not run the excluded-claims search when the settings exclude nothing', async () => {
    const { run, callKibanaApi } = fetchWith([{ hits: [] }], [hit('claimed-1', 'rule-1', 10)]);

    await run();

    const claimSearches = callKibanaApi.mock.calls
      .map(([request]) => request.body)
      .filter(({ aggs }) => aggs === undefined);
    expect(claimSearches).toHaveLength(1);
  });

  // Low severity is a signal, not something to triage: a minimum must keep those alerts from ever
  // reaching a Worker, while the default must not hide any alert that has no severity.
  it.each([
    ['medium', ['medium', 'high', 'critical']],
    ['high', ['high', 'critical']],
    ['critical', ['critical']],
  ] as const)('triages only %s and above when that is the minimum', async (min, expected) => {
    const { run, callKibanaApi } = fetchWith([{ hits: [] }], [], { minSeverity: min });

    await run();

    const unclaimed = callKibanaApi.mock.calls
      .map(([request]) => request.body)
      .find(({ aggs }) => aggs !== undefined);
    expect(unclaimed.query.bool.filter).toContainEqual({
      terms: { 'kibana.alert.severity': expected },
    });
  });

  it('adds no severity clause at the lowest minimum, and never filters claimed alerts', async () => {
    const { run, callKibanaApi } = fetchWith([{ hits: [] }]);

    await run();

    expect(JSON.stringify(callKibanaApi.mock.calls.map(([{ body }]) => body.query))).not.toContain(
      'kibana.alert.severity'
    );
    const medium = fetchWith([{ hits: [] }], [], { minSeverity: 'medium' });
    await medium.run();
    const claimed = medium.callKibanaApi.mock.calls
      .map(([request]) => request.body)
      .find(({ aggs }) => aggs === undefined);
    expect(JSON.stringify(claimed.query)).not.toContain('kibana.alert.severity');
  });

  // A sequence's own alert is not a building block, so excluding them leaves sequences triaged.
  it('keeps building-block alerts and tagged rules out of the unclaimed search only when asked', async () => {
    const off = fetchWith([{ hits: [] }]);
    await off.run();
    const on = fetchWith([{ hits: [] }], [], {
      excludeBuildingBlocks: true,
      excludedRuleTags: ['SEND_TO_DEV'],
    });
    await on.run();

    const bodies = (calls: jest.Mock['mock']['calls']) => calls.map(([{ body }]) => body);
    const unclaimed = (calls: jest.Mock['mock']['calls']) =>
      bodies(calls).find(({ aggs }) => aggs !== undefined);
    const claimed = (calls: jest.Mock['mock']['calls']) =>
      bodies(calls).find(({ aggs }) => aggs === undefined);
    expect(JSON.stringify(unclaimed(off.callKibanaApi.mock.calls).query)).not.toContain(
      'building_block_type'
    );
    expect(unclaimed(on.callKibanaApi.mock.calls).query.bool.must_not).toEqual(
      expect.arrayContaining([
        { exists: { field: 'kibana.alert.building_block_type' } },
        { terms: { 'kibana.alert.rule.tags': ['SEND_TO_DEV'] } },
      ])
    );
    expect(JSON.stringify(claimed(on.callKibanaApi.mock.calls).query)).not.toContain(
      'building_block_type'
    );
  });

  it('fails rather than reading a response without the per-rule alerts as an idle queue', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValue({ status: 200, headers: {}, body: { hits: { hits: [] } } });

    await expect(
      fetchTriageAlerts({ callKibanaApi }, 'alert_analysis:', Date.parse('2026-10-12'), NO_FILTERS)
    ).rejects.toThrow('Per-rule alerts missing');
  });
});
