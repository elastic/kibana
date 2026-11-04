/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { DetectionEngineRulesClient } from '../../service_accounts/detection_engine_rules_client';
import { ALERTS_READER_V2 } from './alerts_reader';
import {
  createSignificantEventsAlertingContextResolver,
  canQueryBeRuleBacked,
} from './significant_events_alerting_context';

describe('canQueryBeRuleBacked', () => {
  it('allows filter-only MATCH queries to be rule-backed', () => {
    expect(
      canQueryBeRuleBacked({
        type: 'match',
        esql: { query: 'FROM logs-* | WHERE level == "error"' },
      })
    ).toBe(true);
  });

  it('does not allow STATS queries until rule-on-rule provisioning', () => {
    expect(
      canQueryBeRuleBacked({
        type: 'stats',
        esql: {
          query:
            'FROM logs | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute) | KEEP bucket, metric_value',
        },
      })
    ).toBe(false);
  });

  it('does not allow MATCH queries that are not filter-only', () => {
    expect(
      canQueryBeRuleBacked({
        type: 'match',
        esql: { query: 'FROM logs-* | KEEP message | WHERE level == "error"' },
      })
    ).toBe(false);
  });
});

describe('createSignificantEventsAlertingContextResolver', () => {
  const v2Client = {} as RulesClientApi;

  const withAccountRulesClient = async <T>(fn: (client: RulesClientApi) => Promise<T>) =>
    fn(v2Client);

  it('returns the v2 alerts reader and the detection engine rules client', async () => {
    const context = await createSignificantEventsAlertingContextResolver({
      getAlertingV2RulesClient: async () => v2Client,
      withAccountRulesClient,
      cpsEnabled: false,
    })();

    expect(context.alertsReader).toBe(ALERTS_READER_V2);
    expect(context.rulesClient).toBeInstanceOf(DetectionEngineRulesClient);
    expect(context.alertingV2RulesClient).toBe(v2Client);
  });

  it('caches context resolution within a request via the resolver factory', async () => {
    const getAlertingV2RulesClient = jest.fn().mockResolvedValue(v2Client);
    const resolveContext = createSignificantEventsAlertingContextResolver({
      getAlertingV2RulesClient,
      withAccountRulesClient,
      cpsEnabled: false,
    });

    const [first, second] = await Promise.all([resolveContext(), resolveContext()]);

    expect(getAlertingV2RulesClient).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first.alertsReader).toBe(ALERTS_READER_V2);
  });

  it.each([true, false])('forwards cpsEnabled=%s to the rules adapter', async (cpsEnabled) => {
    const createRule = jest.fn().mockResolvedValue({});
    const accountClient = { createRule } as unknown as RulesClientApi;
    const context = await createSignificantEventsAlertingContextResolver({
      getAlertingV2RulesClient: async () => v2Client,
      withAccountRulesClient: async (fn) => fn(accountClient),
      cpsEnabled,
    })();

    await context.rulesClient.createRule('rule-1', {
      name: 'Errors',
      sourceId: 'my-stream',
      timestampField: '@timestamp',
      esqlQuery: 'FROM logs-* | WHERE level == "error"',
      schedule: { interval: '5m' },
    });

    expect(createRule.mock.calls[0][0].data.query.base.includes('SET project_routing')).toBe(
      cpsEnabled
    );
  });
});
