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
  getTriagePlanSweepStepDefinition,
  getTriageTagStaleStepDefinition,
} from './alert_triage_steps';

const createContext = (input: Record<string, unknown>, callKibanaApi: jest.Mock) =>
  ({
    input,
    contextManager: { callKibanaApi },
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
    expect(callKibanaApi).not.toHaveBeenCalled();
  });

  it('treats ok without its slots as unknown rather than assuming room', async () => {
    const { output } = await getTriagePlanSweepStepDefinition().handler(
      createContext({ ...baseInput, headroom: { status: 'ok' } }, jest.fn())
    );

    expect(output).toEqual(expect.objectContaining({ skip_reason: 'tm_unknown' }));
  });

  it('plans a batch for a pending alert and claims it', async () => {
    const callKibanaApi = jest.fn(
      async ({ path, body }: { path: string; body?: { query?: unknown } }) => {
        if (path.includes('/executions'))
          return { status: 200, headers: {}, body: { results: [] } };
        if (path.endsWith('/signals/search')) {
          const isClaimedQuery = !JSON.stringify(body?.query).includes('must_not');
          return {
            status: 200,
            headers: {},
            body: {
              hits: {
                hits: isClaimedQuery
                  ? []
                  : [
                      {
                        _id: 'alert-1',
                        _source: {
                          'kibana.alert.rule.uuid': 'rule-a',
                          'kibana.alert.rule.name': 'Rule A name',
                          'kibana.alert.risk_score': 70,
                          'kibana.alert.workflow_status': 'open',
                          'kibana.alert.workflow_tags': [],
                          '@timestamp': new Date().toISOString(),
                        },
                      },
                    ],
              },
            },
          };
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
        batches: [{ rule_id: 'rule-a', rule_name: 'Rule A name', alert_ids: ['alert-1'] }],
      })
    );
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

describe('triage tag stale step', () => {
  it('tags the alerts az:triage_stale in chunks', async () => {
    const callKibanaApi = jest.fn().mockResolvedValue({ status: 200, headers: {}, body: {} });
    const alertIds = Array.from({ length: 1200 }, (_, i) => `a-${i}`);

    const { output } = await getTriageTagStaleStepDefinition().handler(
      createContext({ alert_ids: alertIds }, callKibanaApi)
    );

    expect(output).toEqual({ tagged: 1200 });
    expect(callKibanaApi).toHaveBeenCalledTimes(3);
    expect(callKibanaApi.mock.calls[0][0].body.tags).toEqual({
      tags_to_add: ['az:triage_stale'],
      tags_to_remove: [],
    });
  });

  it('tags nothing and makes no call for an empty list', async () => {
    const callKibanaApi = jest.fn();

    const { output } = await getTriageTagStaleStepDefinition().handler(
      createContext({ alert_ids: [] }, callKibanaApi)
    );

    expect(output).toEqual({ tagged: 0 });
    expect(callKibanaApi).not.toHaveBeenCalled();
  });
});
