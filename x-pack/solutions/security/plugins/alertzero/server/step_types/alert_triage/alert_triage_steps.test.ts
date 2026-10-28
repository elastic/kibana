/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { TM_DELAY_LIMIT_MS } from '../../alert_triage/constants';
import {
  getTriageHeadroomStepDefinition,
  getTriageLoadAlertsStepDefinition,
  getTriageTagPatternKeysStepDefinition,
  getTriagePlanSweepStepDefinition,
  getTriageRetagProposalAlertsStepDefinition,
} from './alert_triage_steps';

const createContext = (input: Record<string, unknown>, callKibanaApi: jest.Mock) =>
  ({
    input,
    contextManager: { callKibanaApi },
    logger: { warn: jest.fn() },
  } as unknown as StepHandlerContext<unknown, unknown>);

const taskManagerWithLag = (lagMs: number | 'fails') =>
  ({
    aggregate: jest.fn(async () => {
      if (lagMs === 'fails') throw new Error('aggregate failed');
      return { aggregations: { oldest: { value: lagMs === 0 ? null : Date.now() - lagMs } } };
    }),
  } as unknown as Pick<TaskManagerStartContract, 'aggregate'>);

const liveExecutions = (ids: string[]) =>
  jest
    .fn()
    .mockResolvedValue({ status: 200, headers: {}, body: { results: ids.map((id) => ({ id })) } });

describe('triage headroom step', () => {
  const input = { batch_workflow_id: 'system-security-floor-alert-triage-batch' };

  it('is ok with the free slots, counting live batches through the executions API', async () => {
    const callKibanaApi = liveExecutions(['e1', 'e2']);
    const step = getTriageHeadroomStepDefinition({ getTaskManager: () => taskManagerWithLag(0) });

    const { output } = await step.handler(createContext(input, callKibanaApi));

    expect(output).toEqual({ status: 'ok', in_flight: 2, slots: 38 });
    expect(callKibanaApi.mock.calls[0][0].path).toContain(
      '/api/workflows/workflow/system-security-floor-alert-triage-batch/executions?'
    );
    expect(callKibanaApi.mock.calls[0][0].path).toContain('statuses=queued');
  });

  it('is behind when Task Manager lags past the limit', async () => {
    const step = getTriageHeadroomStepDefinition({
      getTaskManager: () => taskManagerWithLag(TM_DELAY_LIMIT_MS + 5000),
    });

    const { output } = await step.handler(createContext(input, liveExecutions([])));

    expect(output).toEqual(expect.objectContaining({ status: 'behind' }));
  });

  it('is unknown when the Task Manager read fails', async () => {
    const step = getTriageHeadroomStepDefinition({
      getTaskManager: () => taskManagerWithLag('fails'),
    });

    const { output } = await step.handler(createContext(input, liveExecutions([])));

    expect(output).toEqual({ status: 'unknown' });
  });

  it('assumes half the ceiling in flight when the executions list cannot be read', async () => {
    const step = getTriageHeadroomStepDefinition({ getTaskManager: () => taskManagerWithLag(0) });

    const { output } = await step.handler(
      createContext(input, jest.fn().mockRejectedValue(new Error('boom')))
    );

    expect(output).toEqual({ status: 'ok', in_flight: 20, slots: 20 });
  });
});

describe('triage plan sweep step', () => {
  const baseInput = {
    batch_workflow_id: 'batch',
    analysis_tag_prefix: 'ai-triage',
    budget_per_hour: 600,
    interval_minutes: 10,
    lookback_hours: 24,
    min_severity: 'low' as const,
    exclude_building_blocks: false,
    excluded_rule_tags: [],
  };

  it('starts nothing and touches no alert when headroom is behind', async () => {
    const callKibanaApi = jest.fn();

    const { output } = await getTriagePlanSweepStepDefinition().handler(
      createContext(
        { ...baseInput, headroom: { status: 'behind', lag_ms: 500_000 } },
        callKibanaApi
      )
    );

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'tm_behind', batches: [] }));
    // Only the aged-out count runs: it is a read, so a blocked sweep writes and plans nothing.
    expect(callKibanaApi).toHaveBeenCalledTimes(1);
    expect(callKibanaApi.mock.calls[0][0].path).toBe('/api/detection_engine/signals/search');
  });

  it('treats ok without its slots as unknown rather than assuming room', async () => {
    const { output } = await getTriagePlanSweepStepDefinition().handler(
      createContext({ ...baseInput, headroom: { status: 'ok' } }, jest.fn())
    );

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'tm_unknown' }));
  });

  it('plans a batch for a pending alert and claims it', async () => {
    const pendingAlert = {
      _id: 'alert-1',
      _source: {
        'kibana.alert.rule.uuid': 'rule-a',
        'kibana.alert.rule.name': 'Rule A name',
        'kibana.alert.risk_score': 70,
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.workflow_tags': [],
        '@timestamp': new Date().toISOString(),
      },
    };
    const callKibanaApi = jest.fn(
      async ({
        path,
        body,
      }: {
        path: string;
        body?: { query?: unknown; aggs?: unknown; track_total_hits?: boolean };
      }) => {
        if (path.includes('/executions'))
          return { status: 200, headers: {}, body: { results: [] } };
        if (path.endsWith('/signals/search') && body?.track_total_hits === true) {
          return { status: 200, headers: {}, body: { hits: { total: { value: 13 } } } };
        }
        if (path.endsWith('/signals/search') && body?.aggs !== undefined) {
          // The unclaimed alerts come back as the top alerts of each rule.
          return {
            status: 200,
            headers: {},
            body: {
              aggregations: {
                rules: { buckets: [{ top: { hits: { hits: [pendingAlert] } } }] },
              },
            },
          };
        }
        if (path.endsWith('/signals/search')) {
          return { status: 200, headers: {}, body: { hits: { hits: [] } } };
        }
        return { status: 200, headers: {}, body: {} };
      }
    );

    const { output } = await getTriagePlanSweepStepDefinition().handler(
      createContext(
        { ...baseInput, headroom: { status: 'ok', in_flight: 0, slots: 40 } },
        callKibanaApi
      )
    );

    expect(output).toEqual(
      expect.objectContaining({
        skip_reason: 'none',
        numbers: expect.objectContaining({ aged_out_alerts: 13 }),
        batches: [{ rule_id: 'rule-a', rule_name: 'Rule A name', alert_ids: ['alert-1'] }],
      })
    );
    const searchQueries: string[] = callKibanaApi.mock.calls
      .map(([call]) => call as { path: string; body?: { query?: unknown } })
      .filter(({ path }) => path.endsWith('/signals/search'))
      .map(({ body }) => JSON.stringify(body?.query));
    const agedOutQuery = searchQueries.find((query) => query.includes('"lt":')) ?? '';
    expect(agedOutQuery).toContain('"range":{"@timestamp":{"lt":');
    const unclaimedQuery = searchQueries.find((query) => query.includes('"gte":')) ?? '';
    // The look-back is the search window, so older alerts are never read.
    expect(unclaimedQuery).toContain('"range":{"@timestamp":{"gte":');
    expect(unclaimedQuery).not.toContain('az:triage_stale');
    expect(callKibanaApi).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/api/detection_engine/signals/tags',
        body: {
          ids: ['alert-1'],
          tags: { tags_to_add: ['az:triage_pending'], tags_to_remove: [] },
        },
      })
    );
  });
});

describe('triage load alerts step', () => {
  it('loads the batch documents with _id and _index, as Alert Analysis takes them', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({
      status: 200,
      headers: {},
      body: {
        hits: {
          hits: [
            {
              _id: 'a-1',
              _index: '.alerts-security.alerts-default',
              _source: { '@timestamp': 't', 'kibana.alert.rule.uuid': 'rule-a' },
            },
          ],
        },
      },
    });

    const { output } = await getTriageLoadAlertsStepDefinition().handler(
      createContext({ alert_ids: ['a-1', 'a-2'] }, callKibanaApi)
    );

    expect(output).toEqual({
      alerts: [
        {
          '@timestamp': 't',
          // Alert Analysis requires the nested shape, not the index's flat dotted keys.
          kibana: { alert: { rule: { uuid: 'rule-a' } } },
          _id: 'a-1',
          _index: '.alerts-security.alerts-default',
        },
      ],
      // An alert deleted between planning and the batch is reported, not silently dropped.
      missing_alert_ids: ['a-2'],
    });
    expect(callKibanaApi.mock.calls[0][0].body).toEqual({
      size: 2,
      query: { ids: { values: ['a-1', 'a-2'] } },
    });
  });
});

describe('triage tag pattern keys step', () => {
  const hit = (id: string, executable: string) => ({
    _id: id,
    _index: '.alerts-security.alerts-default',
    _source: {
      'kibana.alert.rule.uuid': 'rule-a',
      'kibana.alert.rule.revision': 1,
      'host.os.type': 'windows',
      'process.executable': executable,
    },
  });

  const run = async (hits: unknown[], fpCandidateIds: string[] = []) => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.endsWith('/signals/tags')
          ? { status: 200, headers: {}, body: { updated: 1, failures: [] } }
          : { status: 200, headers: {}, body: { hits: { hits } } }
      );
    const { output } = await getTriageTagPatternKeysStepDefinition().handler(
      createContext(
        { alert_ids: ['a-1', 'a-2', 'a-3'], fp_candidate_ids: fpCandidateIds, space_id: 'default' },
        callKibanaApi
      )
    );
    const tagCalls = callKibanaApi.mock.calls
      .map(([request]) => request)
      .filter(({ path }) => path.endsWith('/signals/tags'));
    return { output, tagCalls };
  };

  it('tags each pattern once with both key hashes, and counts the keys', async () => {
    const { output, tagCalls } = await run(
      [hit('a-1', 'C:\\Tools\\x.exe'), hit('a-2', 'C:\\Tools\\x.exe')],
      ['a-1']
    );

    expect(tagCalls).toHaveLength(1);
    expect(tagCalls[0].body.ids).toEqual(['a-1', 'a-2']);
    expect(tagCalls[0].body.tags.tags_to_add).toEqual([
      expect.stringMatching(/^az:triage_strict_key:[0-9a-f]{16}$/),
      expect.stringMatching(/^az:triage_wide_key:[0-9a-f]{16}$/),
    ]);
    expect(tagCalls[0].body.tags.tags_to_remove).toEqual([]);
    expect(output).toEqual({
      alerts_with_strict_key: 2,
      strict_keys: 1,
      strict_keys_single_alert: 0,
      wide_keys: 1,
      wide_keys_single_alert: 0,
      fp_candidates_on_fallback: 0,
      // An alert deleted between the verdict and this step is reported, not silently dropped.
      missing_alert_ids: ['a-3'],
    });
  });

  it('fails when a tag update is not fully applied, so a missing key is never reported as written', async () => {
    const callKibanaApi = jest
      .fn()
      .mockImplementation(async ({ path }: { path: string }) =>
        path.endsWith('/signals/tags')
          ? { status: 200, headers: {}, body: { failures: [{}] } }
          : { status: 200, headers: {}, body: { hits: { hits: [hit('a-1', 'C:\\x.exe')] } } }
      );

    await expect(
      getTriageTagPatternKeysStepDefinition().handler(
        createContext(
          { alert_ids: ['a-1'], fp_candidate_ids: [], space_id: 'default' },
          callKibanaApi
        )
      )
    ).rejects.toThrow('not fully applied');
  });
});

describe('triage retag proposal alerts step', () => {
  const searchOf = (ids: string[]) => ({
    status: 200,
    headers: {},
    body: { hits: { hits: ids.map((_id) => ({ _id })) } },
  });
  const tagResponse = { status: 200, headers: {}, body: { updated: 1, failures: [] } };

  it('finds the open false positives by the proposal tag or by id, and swaps the tags', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce(searchOf(['removed', 'listed']))
      .mockResolvedValue(tagResponse);

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext(
        { proposal_id: 'p1', alert_ids: ['listed'], exclude_alert_ids: ['closed'] },
        callKibanaApi
      )
    );

    const { body: search } = callKibanaApi.mock.calls[0][0];
    expect(search.query.bool.should).toEqual([
      { term: { 'kibana.alert.workflow_tags': 'az:proposal:p1' } },
      { ids: { values: ['listed'] } },
    ]);
    expect(search.query.bool.minimum_should_match).toBe(1);
    expect(search.query.bool.filter).toContainEqual({
      term: { 'kibana.alert.workflow_tags': 'az:false_positive' },
    });
    expect(search.query.bool.must_not).toEqual([{ ids: { values: ['closed'] } }]);
    expect(callKibanaApi.mock.calls[1][0].body).toEqual({
      ids: ['removed', 'listed'],
      tags: { tags_to_add: ['az:inconclusive'], tags_to_remove: ['az:false_positive'] },
    });
    expect(output).toEqual({ matched: 2, failed: 0 });
  });

  it('also removes az:model_fp when a human disagreed', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce(searchOf(['a']))
      .mockResolvedValue(tagResponse);

    await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1', drop_model_fp: true }, callKibanaApi)
    );

    expect(callKibanaApi.mock.calls[1][0].body.tags.tags_to_remove).toEqual([
      'az:false_positive',
      'az:model_fp',
    ]);
  });

  it('searches by id only when there is no proposal id', async () => {
    const callKibanaApi = jest.fn().mockResolvedValueOnce(searchOf([]));

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ alert_ids: ['a'] }, callKibanaApi)
    );

    expect(callKibanaApi.mock.calls[0][0].body.query.bool.should).toEqual([
      { ids: { values: ['a'] } },
    ]);
    expect(callKibanaApi).toHaveBeenCalledTimes(1);
    expect(output).toEqual({ matched: 0, failed: 0 });
  });

  it('retries a failed chunk before counting it', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce(searchOf(['a']))
      .mockRejectedValueOnce(new Error('conflict'))
      .mockResolvedValue(tagResponse);

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1' }, callKibanaApi)
    );

    expect(output).toEqual({ matched: 1, failed: 0 });
  });

  it('counts a chunk that keeps failing and still re-tags the others', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `a${i}`);
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce(searchOf(ids))
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(tagResponse);

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1' }, callKibanaApi)
    );

    expect(output).toEqual({ matched: 501, failed: 500 });
  });

  it('also removes az:model_fp from candidates that were closed before the dismissal', async () => {
    const callKibanaApi = jest
      .fn()
      .mockResolvedValueOnce(searchOf([]))
      .mockResolvedValueOnce(searchOf(['closed']))
      .mockResolvedValue(tagResponse);

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1', drop_model_fp: true }, callKibanaApi)
    );

    const { body: search } = callKibanaApi.mock.calls[1][0];
    expect(search.query.bool.filter).toEqual([
      { term: { 'kibana.alert.workflow_tags': 'az:model_fp' } },
    ]);
    expect(callKibanaApi.mock.calls[2][0].body).toEqual({
      ids: ['closed'],
      tags: { tags_to_add: [], tags_to_remove: ['az:model_fp'] },
    });
    expect(output).toEqual({ matched: 1, failed: 0 });
  });

  // A fake index: the search returns up to 10,000 open alerts, and a tag call closes them to the query.
  const indexWith = (open: Set<string>, { tagsApply = true }: { tagsApply?: boolean } = {}) =>
    jest.fn(async ({ path, body }: { path: string; body: { ids?: string[] } }) => {
      if (path.endsWith('/signals/search')) return searchOf([...open].slice(0, 10_000));
      if (tagsApply) body.ids?.forEach((id) => open.delete(id));
      return tagResponse;
    });

  it('searches again after a full page, so no alert beyond the search limit is skipped', async () => {
    const open = new Set(Array.from({ length: 10_001 }, (_, i) => `a${i}`));

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1' }, indexWith(open))
    );

    expect(output).toEqual({ matched: 10_001, failed: 0 });
    expect(open.size).toBe(0);
  });

  it('counts an alert the update left unchanged as failed, because the last search still finds it', async () => {
    const open = new Set(['a']);

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1' }, indexWith(open, { tagsApply: false }))
    );

    expect(output).toEqual({ matched: 1, failed: 1 });
  });

  it('searches past alerts that failed, so one that sorts later is still attempted', async () => {
    const failing = Array.from({ length: 10_000 }, (_, i) => `f${i}`);
    const later = new Set(['z']);
    const callKibanaApi = jest.fn(
      async ({ path, body }: { path: string; body: { ids?: string[]; query?: any } }) => {
        if (path.endsWith('/signals/search')) {
          const excluded = new Set<string>(body.query.bool.must_not[0].ids.values);
          return searchOf(
            [...failing, ...later].filter((id) => !excluded.has(id)).slice(0, 10_000)
          );
        }
        if (body.ids?.includes('z')) {
          later.delete('z');
          return tagResponse;
        }
        throw new Error('boom');
      }
    );

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1' }, callKibanaApi)
    );

    expect(output).toEqual({ matched: 10_001, failed: 10_000 });
  });

  it('stops when searches keep returning alerts it already tried', async () => {
    const page = ['a', 'b'];
    const callKibanaApi = jest.fn(async ({ path }: { path: string }) => {
      if (path.endsWith('/signals/search')) return searchOf(page);
      throw new Error('boom');
    });

    const { output } = await getTriageRetagProposalAlertsStepDefinition().handler(
      createContext({ proposal_id: 'p1' }, callKibanaApi)
    );

    expect(output).toEqual({ matched: 2, failed: 2 });
  });

  it('accepts as many candidates as the review workflow does', () => {
    const { alert_ids: alertIds } = getTriageRetagProposalAlertsStepDefinition().inputSchema.parse({
      alert_ids: Array.from({ length: 11_000 }, (_, i) => `a${i}`),
    });
    expect(alertIds).toHaveLength(11_000);
  });

  it('fails when the search fails, so the review retries it', async () => {
    await expect(
      getTriageRetagProposalAlertsStepDefinition().handler(
        createContext({ proposal_id: 'p1' }, jest.fn().mockRejectedValue(new Error('down')))
      )
    ).rejects.toThrow('down');
  });
});
