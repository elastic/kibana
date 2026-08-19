/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  apiTest,
  LOCAL_PUBLIC_LOCATION,
  mergeSyntheticsApiHeaders,
  SYNTHETICS_API_URLS,
  SYNTHETICS_MONITOR_SO_TYPES,
  type SyntheticsApiServicesFixture,
} from '../../../common/fixtures';
import { addMonitor, enableSynthetics } from '../../../common/fixtures/monitors';
import { tryForTime } from '../../../common/fixtures/retry';

const RULE_TAG = 'scout-status-pending-threshold';
const STATUS_RULE_TYPE_ID = 'xpack.synthetics.alerts.monitorStatus';
const STATUS_RULE_CONSUMER = 'uptime';
const ALERTS_INDEX = '.alerts-observability.uptime.alerts-default*';

interface AlertDoc {
  'kibana.alert.status'?: string;
  'kibana.alert.reason'?: string;
  'kibana.alert.instance.id'?: string;
}

interface StatusRuleInspectBody {
  pendingConfigs?: Record<string, { configId: string; pendingCount?: number }>;
}

interface AlertingRuleBody {
  id: string;
  params: {
    condition?: { pendingThreshold?: number; alertOnNoData?: boolean };
  };
}

/**
 * API coverage for `condition.pendingThreshold` on custom Synthetics monitor
 * status rules. Schema/persistence goes through `POST/GET api/alerting/rule`;
 * consecutive-pending firing is driven with `_run_soon` against a real rule,
 * matching `tls_rule_browser_certs_alert.spec.ts`.
 *
 * HTTP monitors are not treated as pending until they are at least one minute
 * old (`isMonitorReadyForData`). Tests share worker-scoped state and run
 * sequentially: the inspect wait unblocks the firing cases.
 */
apiTest.describe(
  'statusRulePendingThreshold',
  {
    tag: ['@local-stateful-classic', '@local-serverless-observability_complete'],
  },
  () => {
    let editorHeaders: Record<string, string>;
    let monitorId: string;
    let thresholdTwoRuleId: string;
    let thresholdTwoDateStart: Date;

    const pendingCondition = (pendingThreshold: number) => ({
      alertOnNoData: true,
      locationsThreshold: 1,
      window: { numberOfChecks: 5 },
      groupBy: 'locationId',
      downThreshold: 5,
      pendingThreshold,
    });

    const createRulePayload = (pendingThreshold: number, enabled: boolean) => ({
      name: `Scout pending threshold ${pendingThreshold}`,
      rule_type_id: STATUS_RULE_TYPE_ID,
      consumer: STATUS_RULE_CONSUMER,
      tags: [RULE_TAG],
      schedule: { interval: '1d' },
      enabled,
      actions: [],
      params: {
        condition: pendingCondition(pendingThreshold),
        monitorIds: [monitorId],
      },
    });

    const inspectStatusRule = async (apiClient: ApiClientFixture) => {
      const res = await apiClient.post(SYNTHETICS_API_URLS.INSPECT_STATUS_RULE, {
        headers: editorHeaders,
        body: {
          monitorIds: [monitorId],
          condition: pendingCondition(2),
        },
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(200);
      return res.body as StatusRuleInspectBody;
    };

    const waitUntilMonitorIsPending = async (apiClient: ApiClientFixture) => {
      await tryForTime(
        90_000,
        async () => {
          const body = await inspectStatusRule(apiClient);
          const pending = Object.values(body.pendingConfigs ?? {});
          const match = pending.find((config) => config.configId === monitorId);
          expect(match).toBeDefined();
          return match;
        },
        { intervalMs: 2_000 }
      );
    };

    const getAlertsForRule = async (esClient: EsClient, ruleId: string): Promise<AlertDoc[]> => {
      const res = await esClient.search<AlertDoc>({
        index: ALERTS_INDEX,
        ignore_unavailable: true,
        size: 10,
        query: {
          bool: {
            filter: [{ term: { 'kibana.alert.rule.uuid': ruleId } }],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      });
      return res.hits.hits
        .map((hit) => hit._source)
        .filter((source): source is AlertDoc => source != null);
    };

    const runRuleAndWaitForExecutions = async (
      apiServices: SyntheticsApiServicesFixture,
      ruleId: string,
      count: number,
      dateStart: Date
    ) => {
      await apiServices.alerting.rules.runSoon(ruleId);
      await apiServices.alerting.waiting.waitForExecutionCount(
        ruleId,
        count,
        undefined,
        60_000,
        dateStart
      );
    };

    apiTest.beforeAll(async ({ requestAuth, apiClient, apiServices, kbnClient }) => {
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
      await apiServices.alerting.cleanup.deleteRulesByTags([RULE_TAG]);

      const { apiKeyHeader } = await requestAuth.getApiKey('editor');
      editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader, { Accept: 'application/json' });
      await enableSynthetics(apiClient, editorHeaders);

      const monitorRes = await addMonitor(apiClient, editorHeaders, {
        type: 'http',
        locations: [LOCAL_PUBLIC_LOCATION.id],
        url: 'https://www.google.com',
        name: 'Scout pending-threshold HTTP monitor',
        tags: [RULE_TAG],
      });
      monitorId = (monitorRes.body as { id: string }).id;
    });

    apiTest.afterAll(async ({ apiServices, kbnClient }) => {
      await apiServices.alerting.cleanup.deleteRulesByTags([RULE_TAG]);
      await kbnClient.savedObjects.clean({ types: SYNTHETICS_MONITOR_SO_TYPES });
    });

    apiTest('rejects pendingThreshold below 1', async ({ apiClient }) => {
      const res = await apiClient.post('api/alerting/rule', {
        headers: editorHeaders,
        body: createRulePayload(0, false),
        responseType: 'json',
      });
      expect(res).toHaveStatusCode(400);
    });

    apiTest('persists pendingThreshold on a custom status rule', async ({ apiClient }) => {
      const created = await apiClient.post('api/alerting/rule', {
        headers: editorHeaders,
        body: createRulePayload(3, false),
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
      const createdBody = created.body as AlertingRuleBody;
      expect(createdBody.params.condition?.pendingThreshold).toBe(3);
      expect(createdBody.params.condition?.alertOnNoData).toBe(true);

      const fetched = await apiClient.get(`api/alerting/rule/${createdBody.id}`, {
        headers: editorHeaders,
        responseType: 'json',
      });
      expect(fetched).toHaveStatusCode(200);
      const fetchedBody = fetched.body as AlertingRuleBody;
      expect(fetchedBody.params.condition?.pendingThreshold).toBe(3);
    });

    apiTest(
      'inspect_status_rule reports the monitor as pending after the no-data grace period',
      { timeout: 180_000 },
      async ({ apiClient }) => {
        await waitUntilMonitorIsPending(apiClient);
        const body = await inspectStatusRule(apiClient);
        const match = Object.values(body.pendingConfigs ?? {}).find(
          (config) => config.configId === monitorId
        );
        expect(match?.pendingCount).toBe(1);
      }
    );

    apiTest(
      'does not fire on the first pending evaluation when pendingThreshold is 2',
      { timeout: 180_000 },
      async ({ apiClient, apiServices, esClient }) => {
        await waitUntilMonitorIsPending(apiClient);

        const created = await apiServices.alerting.rules.create({
          name: 'Scout pending threshold 2',
          ruleTypeId: STATUS_RULE_TYPE_ID,
          consumer: STATUS_RULE_CONSUMER,
          params: {
            condition: pendingCondition(2),
            monitorIds: [monitorId],
          },
          schedule: { interval: '1d' },
          enabled: true,
          tags: [RULE_TAG],
        });
        expect(created).toHaveStatusCode(200);
        thresholdTwoRuleId = created.data.id;
        thresholdTwoDateStart = new Date();

        await runRuleAndWaitForExecutions(
          apiServices,
          thresholdTwoRuleId,
          1,
          thresholdTwoDateStart
        );

        const alerts = await getAlertsForRule(esClient, thresholdTwoRuleId);
        expect(alerts.filter((alert) => alert['kibana.alert.status'] === 'active')).toHaveLength(0);
      }
    );

    apiTest(
      'fires on the second consecutive pending evaluation when pendingThreshold is 2',
      { timeout: 180_000 },
      async ({ apiServices, esClient }) => {
        await runRuleAndWaitForExecutions(
          apiServices,
          thresholdTwoRuleId,
          2,
          thresholdTwoDateStart
        );

        await tryForTime(60_000, async () => {
          const alerts = await getAlertsForRule(esClient, thresholdTwoRuleId);
          const active = alerts.find((alert) => alert['kibana.alert.status'] === 'active');
          expect(active).toBeDefined();
          expect(active?.['kibana.alert.reason']).toContain('is pending');
          expect(active?.['kibana.alert.instance.id']).toBe(
            `${monitorId}-${LOCAL_PUBLIC_LOCATION.id}`
          );
        });
      }
    );

    apiTest(
      'fires on the first pending evaluation when pendingThreshold is 1',
      { timeout: 180_000 },
      async ({ apiClient, apiServices, esClient }) => {
        await waitUntilMonitorIsPending(apiClient);

        const created = await apiServices.alerting.rules.create({
          name: 'Scout pending threshold 1',
          ruleTypeId: STATUS_RULE_TYPE_ID,
          consumer: STATUS_RULE_CONSUMER,
          params: {
            condition: pendingCondition(1),
            monitorIds: [monitorId],
          },
          schedule: { interval: '1d' },
          enabled: true,
          tags: [RULE_TAG],
        });
        expect(created).toHaveStatusCode(200);
        const ruleId = created.data.id as string;

        const dateStart = new Date();
        await runRuleAndWaitForExecutions(apiServices, ruleId, 1, dateStart);

        await tryForTime(60_000, async () => {
          const alerts = await getAlertsForRule(esClient, ruleId);
          const active = alerts.find((alert) => alert['kibana.alert.status'] === 'active');
          expect(active).toBeDefined();
          expect(active?.['kibana.alert.reason']).toContain('is pending');
        });
      }
    );
  }
);
