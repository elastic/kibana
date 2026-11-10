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
  createCustomStatusRule,
  makeSummaries,
  createStatusRuleTestEnv,
  setupStatusRuleTestEnv,
  teardownStatusRuleTestEnv,
  waitForActionDocuments,
  waitForStatusAlert,
} from '../fixtures/status_rule_helper';

const SLOW_TEST_TIMEOUT_MS = 180_000;

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/alerting/synthetics/custom_status_rule.ts`.
 *
 * Covers a `numberOfChecks` window custom status rule with `groupBy: 'locationId'`
 * and 2 down locations.
 */
apiTest.describe(
  'SyntheticsCustomStatusRule — numberOfChecks grouped, 2 down locations',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('checks-grouped-two-locations');

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
      'numberOfChecks - location threshold = 1 - grouped by location - 2 down locations',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step('creates a monitor', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor location based at ${moment().format('LT')}`
          );
          expect(monitor.id).toBeDefined();
          env.monitorIds.push(monitor.id);
        });

        await apiTest.step(
          'creates a custom rule with 1 location threshold grouped by location and triggers alerts for both locations',
          async () => {
            const params: StatusRuleParams = {
              condition: {
                window: {
                  numberOfChecks: 1,
                },
                groupBy: 'locationId',
                locationsThreshold: 1,
                downThreshold: 1,
              },
              monitorIds: [monitor.id],
            };

            const rule = await createCustomStatusRule({
              apiServices,
              env,
              params,
            });
            ruleId = rule.id;
            expect(rule.params).toStrictEqual(params);

            await makeSummaries({
              esClient,
              monitor,
              downChecks: 1,
              location: {
                id: 'dev2',
                label: 'Dev Service 2',
              },
            });
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

            for (const hit of response.hits.hits) {
              const alert = hit._source;
              expect(alert?.['kibana.alert.status']).toBe('active');
              const locationName = [alert?.['location.name']].flat()[0];
              expect(alert?.['kibana.alert.reason']).toBe(
                `Monitor "${monitor.name}" from ${locationName} is down. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.`
              );
            }

            const downResponse = await waitForActionDocuments({
              esClient,
              indexName: env.alertActionIndex,
              docCountTarget: 2,
              filters: [{ term: { 'monitor.id': monitor.id } }],
            });
            const lastTwoHits = downResponse.hits.hits.slice(-2).map((hit) => hit._source);

            for (const hit of lastTwoHits) {
              const locationId = hit?.locationId;
              expect(locationId).toBeDefined();
              expect(hit?.reason).toBe(
                `Monitor "${monitor.name}" from ${hit?.locationNames} is down. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.`
              );
              expect(hit?.linkMessage).toBe(
                buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, locationId as string)
              );
            }
          }
        );
      }
    );
  }
);
