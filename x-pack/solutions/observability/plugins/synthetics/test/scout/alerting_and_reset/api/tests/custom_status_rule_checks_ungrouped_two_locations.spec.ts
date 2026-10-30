/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { expect } from '@kbn/scout-oblt/api';
import type { SyntheticsMonitorStatusRuleParams as StatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
import type { EncryptedSyntheticsSavedMonitor } from '../../../../../common/runtime_types';
import { apiTest } from '../../../common/fixtures';
import {
  addTestMonitor,
  buildExpectedErrorLink,
  clearActionIndex,
  createCustomStatusRule,
  makeSummaries,
  runAndSearchActiveStatusAlerts,
  createStatusRuleTestEnv,
  setupStatusRuleTestEnv,
  teardownStatusRuleTestEnv,
  waitForActionDocuments,
  waitForStatusAlert,
} from '../fixtures/status_rule_helper';

const SLOW_TEST_TIMEOUT_MS = 240_000;

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/alerting/synthetics/custom_status_rule.ts`.
 *
 * Covers a `numberOfChecks` window custom status rule with `groupBy: 'none'`,
 * location threshold > 1 and the default recovery strategy.
 */
apiTest.describe(
  'SyntheticsCustomStatusRule — numberOfChecks ungrouped, 2 down locations',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('checks-ungrouped-two-locations');

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
      'numberOfChecks - location threshold > 1 - ungrouped - 2 down locations',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step(
          'creates a monitor and custom rule with location threshold',
          async () => {
            monitor = await addTestMonitor(
              apiClient,
              env.editorHeaders,
              `Monitor location based at ${moment().format('LT')} ungrouped 2 locations`
            );
            expect(monitor.id).toBeDefined();
            env.monitorIds.push(monitor.id);

            const params: StatusRuleParams = {
              condition: {
                locationsThreshold: 2,
                window: {
                  numberOfChecks: 1,
                },
                groupBy: 'none',
                downThreshold: 1,
              },
              monitorIds: [monitor.id],
            };
            const rule = await createCustomStatusRule({
              apiServices,
              env,
              params,
              name: 'When down from 2 locations',
            });
            ruleId = rule.id;
            expect(rule.params).toStrictEqual(params);
          }
        );

        await apiTest.step(
          'does not trigger down alert based on location threshold with one location down',
          async () => {
            const docs = await makeSummaries({
              esClient,
              monitor,
              downChecks: 1,
            });
            const activeAlerts = await runAndSearchActiveStatusAlerts({
              esClient,
              apiServices,
              ruleId,
              monitorId: monitor.id,
              sinceTimestamp: docs[0]['@timestamp'],
            });
            expect(activeAlerts.hits.hits).toHaveLength(0);
          }
        );

        await apiTest.step(
          'triggers down alert based on location threshold with two locations down',
          async () => {
            await clearActionIndex(esClient, env.alertActionIndex);
            // 1st down check from dev 2
            await makeSummaries({
              esClient,
              monitor,
              downChecks: 1,
              location: {
                id: 'dev2',
                label: 'Dev Service 2',
              },
            });
            // 2nd down check from dev 1
            const downDocs = await makeSummaries({
              esClient,
              monitor,
              downChecks: 1,
            });

            const response = await waitForStatusAlert({
              esClient,
              apiServices,
              ruleId,
              filters: [
                { term: { 'kibana.alert.status': 'active' } },
                { term: { 'monitor.id': monitor.id } },
                { range: { '@timestamp': { gte: downDocs[0]['@timestamp'] } } },
              ],
            });
            const alert = response.hits.hits[0]?._source;
            expect(alert?.['kibana.alert.status']).toBe('active');
            expect(alert?.['kibana.alert.reason']).toBe(
              `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
            );

            const downResponse = await waitForActionDocuments({
              esClient,
              indexName: env.alertActionIndex,
              filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'active' } }],
            });
            const actionDoc = downResponse.hits.hits[0]?._source;
            expect(actionDoc?.reason).toBe(
              `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
            );
            expect(actionDoc?.locationNames).toBe('Dev Service and Dev Service 2');
            expect(actionDoc?.linkMessage).toBe(
              buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
            );
            expect(actionDoc?.locationId).toBe('dev and dev2');
          }
        );

        await apiTest.step('triggers recovered alert', async () => {
          await clearActionIndex(esClient, env.alertActionIndex);
          const docs = await makeSummaries({
            esClient,
            monitor,
            upChecks: 1,
          });

          const response = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'recovered' } },
              { term: { 'monitor.id': monitor.id } },
              { range: { '@timestamp': { gte: docs[0]['@timestamp'] } } },
            ],
          });
          expect(response.hits.hits[0]?._source?.['kibana.alert.status']).toBe('recovered');

          const recoveryResponse = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'recovered' } }],
          });
          const actionDoc = recoveryResponse.hits.hits[0]?._source;
          expect(actionDoc?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service and Dev Service 2 is recovered. Alert when 1 out of the last 1 checks are down from at least 2 locations.`
          );
          expect(actionDoc?.locationNames).toBe('Dev Service and Dev Service 2');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev and dev2');
        });

        await apiTest.step('is down again', async () => {
          await clearActionIndex(esClient, env.alertActionIndex);
          const downDocs = await makeSummaries({
            esClient,
            monitor,
            downChecks: 1,
          });

          const response = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'active' } },
              { term: { 'monitor.id': monitor.id } },
              { range: { '@timestamp': { gte: downDocs[0]['@timestamp'] } } },
            ],
          });
          const alert = response.hits.hits[0]?._source;
          expect(alert?.['kibana.alert.status']).toBe('active');
          expect(alert?.['kibana.alert.reason']).toBe(
            `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
          );

          const downResponse = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'active' } }],
          });
          const alertActionDoc = downResponse.hits.hits[0]?._source;
          expect(alertActionDoc?.reason).toBe(
            `Monitor "${monitor.name}" is down 1 time from Dev Service and 1 time from Dev Service 2. Alert when down 1 time out of the last 1 checks from at least 2 locations.`
          );
          expect(alertActionDoc?.locationNames).toBe('Dev Service and Dev Service 2');
          expect(alertActionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(alertActionDoc?.locationId).toBe('dev and dev2');
        });

        await apiTest.step(
          'triggers recovered alert when the location threshold is no longer met',
          async () => {
            await clearActionIndex(esClient, env.alertActionIndex);
            const upDocs = await makeSummaries({
              esClient,
              monitor,
              upChecks: 1,
            });

            const response = await waitForStatusAlert({
              esClient,
              apiServices,
              ruleId,
              filters: [
                { term: { 'kibana.alert.status': 'recovered' } },
                { term: { 'monitor.id': monitor.id } },
                { range: { '@timestamp': { gte: upDocs[0]['@timestamp'] } } },
              ],
            });
            expect(response.hits.hits[0]?._source?.['kibana.alert.status']).toBe('recovered');

            const recoveryResponse = await waitForActionDocuments({
              esClient,
              indexName: env.alertActionIndex,
              filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'recovered' } }],
            });
            const alertActionDoc = recoveryResponse.hits.hits[0]?._source;
            expect(alertActionDoc?.reason).toBe(
              `Monitor "${monitor.name}" from Dev Service and Dev Service 2 is recovered. Alert when 1 out of the last 1 checks are down from at least 2 locations.`
            );
            expect(alertActionDoc?.locationNames).toBe('Dev Service and Dev Service 2');
            expect(alertActionDoc?.linkMessage).toBe(
              buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
            );
            expect(alertActionDoc?.locationId).toBe('dev and dev2');
            expect(alertActionDoc?.recoveryReason).toMatch(
              /the monitor is now up again\. It ran successfully at /
            );
            expect(alertActionDoc?.recoveryStatus).toBe('is now up');
          }
        );
      }
    );
  }
);
