/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_FETCH_LIMIT, BATCH_ALERT_CAP, RULE_FETCH_LIMIT } from '../../alert_triage/constants';
import { fetchTriageAlerts, listLiveExecutionIds, loadAlertsByIds, tagAlerts } from './ports';

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

  const fetchWith = (rules: Array<{ hits: unknown[] }>, claimedHits: unknown[] = []) => {
    const callKibanaApi = jest.fn().mockImplementation(async ({ body }) => ({
      status: 200,
      headers: {},
      body: body.aggs
        ? {
            aggregations: {
              rules: { buckets: rules.map(({ hits }) => ({ top: { hits: { hits } } })) },
            },
          }
        : { hits: { hits: claimedHits } },
    }));
    return {
      callKibanaApi,
      run: () => fetchTriageAlerts({ callKibanaApi }, 'alert_analysis:', Date.parse('2026-10-12')),
    };
  };

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

  it('fails rather than reading a response without the per-rule alerts as an idle queue', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValue({ status: 200, headers: {}, body: { hits: { hits: [] } } });

    await expect(
      fetchTriageAlerts({ callKibanaApi }, 'alert_analysis:', Date.parse('2026-10-12'))
    ).rejects.toThrow('Per-rule alerts missing');
  });
});
