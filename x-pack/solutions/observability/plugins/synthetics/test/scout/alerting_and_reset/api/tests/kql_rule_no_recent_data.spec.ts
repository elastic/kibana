/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type { EsClient } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../common/runtime_types';
import { apiTest } from '../../../common/fixtures';
import { delay } from '../../../common/fixtures/retry';
import {
  DEV_LOCATIONS,
  SYNTHETICS_DOCS_INDEX,
  addTestMonitor,
  createCustomStatusRule,
  makeSummaries,
  runAndSearchActiveStatusAlerts,
  createStatusRuleTestEnv,
  setupStatusRuleTestEnv,
  teardownStatusRuleTestEnv,
  waitForStatusAlert,
} from '../fixtures/status_rule_helper';

const SLOW_TEST_TIMEOUT_MS = 240_000;
const MONITOR_READY_FOR_PENDING_MS = 75_000;

/**
 * Moves every check of the monitor back by more than a day, outside the 24h
 * window the rule's KQL filter is resolved against.
 */
const moveChecksBeyondKqlWindow = async (esClient: EsClient, monitorId: string) => {
  const { hits } = await esClient.search<Record<string, unknown>>({
    index: `${SYNTHETICS_DOCS_INDEX}*`,
    size: 100,
    query: { term: { 'monitor.id': monitorId } },
  });
  expect(hits.hits.length).toBeGreaterThan(0);

  // Data streams only accept new documents, so re-index a copy of each check.
  for (const hit of hits.hits) {
    await esClient.delete({ index: hit._index, id: hit._id!, refresh: true });
    await esClient.index({
      index: SYNTHETICS_DOCS_INDEX,
      refresh: true,
      document: {
        ...hit._source,
        '@timestamp': moment(hit._source?.['@timestamp'] as string)
          .subtract(25, 'hours')
          .toISOString(),
      },
    });
  }
};

/**
 * Verifies that a custom monitor status rule with a KQL filter keeps evaluating
 * an alerting monitor after it has stopped reporting for more than 24h. The KQL
 * filter only matches monitors with recent checks, so without this the monitor
 * would drop out of the rule and its alert would recover as deleted.
 */
apiTest.describe(
  'SyntheticsCustomStatusRule — KQL filter, no recent data',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('kql-no-recent-data');

    apiTest.beforeAll(
      async ({ requestAuth, samlAuth, apiClient, apiServices, esClient, config }) => {
        await setupStatusRuleTestEnv(env, {
          requestAuth,
          samlAuth,
          apiClient,
          apiServices,
          esClient,
          config,
        });
      }
    );

    apiTest.afterAll(async ({ apiClient, apiServices, esClient }) => {
      await teardownStatusRuleTestEnv(env, { apiClient, apiServices, esClient });
    });

    apiTest(
      'keeps the alert active as pending instead of recovering it as deleted',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);

        let monitor: EncryptedSyntheticsSavedMonitor;
        let ruleId = '';
        let monitorCreatedAt = 0;
        const condition: StatusRuleParams['condition'] = {
          alertOnNoData: true,
          locationsThreshold: 1,
          window: {
            numberOfChecks: 1,
          },
          groupBy: 'locationId',
          downThreshold: 1,
          pendingThreshold: 1,
        };

        await apiTest.step('creates a monitor and a custom rule with a KQL filter', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor KQL no recent data at ${moment().format('LLL')}`
          );
          expect(monitor.id).toBeDefined();
          env.monitorIds.push(monitor.id);
          monitorCreatedAt = Date.now();

          const rule = await createCustomStatusRule({
            apiServices,
            env,
            params: { condition, kqlQuery: `config_id: "${monitor.config_id}"` },
            name: 'KQL filter, alert on no data',
          });
          ruleId = rule.id;
        });

        await apiTest.step('fires a down alert', async () => {
          await Promise.all(
            DEV_LOCATIONS.map((location) =>
              makeSummaries({
                esClient,
                monitor,
                downChecks: 1,
                location: { id: location.id, label: location.label },
              })
            )
          );

          const alert = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'active' } },
              { term: { 'location.id': 'dev' } },
              { wildcard: { 'kibana.alert.reason': { value: '*down*' } } },
            ],
            timeoutMs: 120_000,
          });
          expect(alert.hits.hits).toHaveLength(1);
        });

        await apiTest.step(
          'reports the alert as pending once the monitor has no checks in the last 24h',
          async () => {
            // The rule only reports no data for HTTP monitors older than a minute.
            await delay(Math.max(0, monitorCreatedAt + MONITOR_READY_FOR_PENDING_MS - Date.now()));
            await moveChecksBeyondKqlWindow(esClient, monitor.id);
            const movedAt = new Date().toISOString();

            // Only trust alert documents written by a rule run that started after the move.
            const activeAlerts = await runAndSearchActiveStatusAlerts({
              esClient,
              apiServices,
              ruleId,
              monitorId: monitor.id,
              sinceTimestamp: movedAt,
            });
            const devAlert = activeAlerts.hits.hits.find(
              ({ _source }) => _source?.['kibana.alert.instance.id'] === `${monitor.config_id}-dev`
            );
            expect(devAlert?._source?.['kibana.alert.reason']).toContain('is pending');

            const recovered = await esClient.search({
              index: env.alertActionIndex,
              query: {
                bool: {
                  filter: [
                    { term: { 'monitor.id': monitor.id } },
                    { term: { status: 'recovered' } },
                  ],
                },
              },
            });
            expect(recovered.hits.hits).toHaveLength(0);
          }
        );
      }
    );
  }
);
