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
import { apiTest, mergeSyntheticsApiHeaders } from '../../../common/fixtures';
import {
  addTestMonitor,
  buildExpectedErrorLink,
  clearActionIndex,
  createCustomStatusRule,
  createStatusRuleTestEnv,
  makeSummaries,
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
 * Covers `numberOfChecks` window custom status rules with `groupBy: 'locationId'`
 * (1 location down + recovery, and 2 locations down).
 */
apiTest.describe(
  'SyntheticsCustomStatusRule — numberOfChecks grouped by location',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('checks-grouped');
    const createdMonitorIds: string[] = [];
    let kibanaBaseUrl: string;

    apiTest.beforeAll(
      async ({ requestAuth, apiClient, apiServices, esClient, config, samlAuth }) => {
        kibanaBaseUrl = config.hosts.kibana;
        const { apiKeyHeader } = await requestAuth.getApiKey('editor');
        const editorHeaders = mergeSyntheticsApiHeaders(apiKeyHeader);
        await setupStatusRuleTestEnv({
          env,
          apiClient,
          apiServices,
          esClient,
          samlAuth,
          editorHeaders,
        });
      }
    );

    apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await teardownStatusRuleTestEnv({
        env,
        apiServices,
        esClient,
        kbnClient,
        monitorIds: createdMonitorIds,
      });
    });

    apiTest(
      'numberOfChecks - location threshold = 1 - grouped by location - 1 location down',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step('creates a monitor and custom rule', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor check based at ${moment().format('LLL')}`
          );
          expect(monitor.id).toBeDefined();
          createdMonitorIds.push(monitor.id);

          const params: StatusRuleParams = {
            condition: {
              locationsThreshold: 1,
              window: {
                numberOfChecks: 5,
              },
              groupBy: 'locationId',
              downThreshold: 5,
            },
            monitorIds: [monitor.id],
          };
          const rule = await createCustomStatusRule({
            apiServices,
            env,
            params,
            name: 'When down 5 times from 1 location',
          });
          ruleId = rule.id;
          expect(rule.params).toStrictEqual(params);
        });

        await apiTest.step('triggers down alert', async () => {
          await makeSummaries({
            esClient,
            monitor,
            downChecks: 5,
          });
          const response = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
          });

          const alert = response.hits.hits[0]?._source;
          expect(alert?.['kibana.alert.status']).toBe('active');
          expect(alert?.['kibana.alert.reason']).toBe(
            `Monitor "${monitor.name}" from Dev Service is down. Monitor is down 5 times within the last 5 checks. Alert when 5 out of the last 5 checks are down from at least 1 location.`
          );

          const downResponse = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }],
          });
          const actionDoc = downResponse.hits.hits[0]?._source;
          expect(actionDoc?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service is down. Monitor is down 5 times within the last 5 checks. Alert when 5 out of the last 5 checks are down from at least 1 location.`
          );
          expect(actionDoc?.locationNames).toBe('Dev Service');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev');
        });

        await apiTest.step('triggers recovered alert', async () => {
          const docs = await makeSummaries({
            esClient,
            monitor,
            upChecks: 1,
          });

          const response = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [{ term: { 'kibana.alert.status': 'recovered' } }],
          });
          const alert = response.hits.hits[0]?._source;
          expect(alert?.['kibana.alert.status']).toBe('recovered');

          const recoveredResponse = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'recovered' } }],
          });
          const actionDoc = recoveredResponse.hits.hits[0]?._source;
          expect(actionDoc?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service is recovered. Alert when 5 out of the last 5 checks are down from at least 1 location.`
          );
          expect(actionDoc?.locationNames).toBe('Dev Service');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev');
          expect(actionDoc?.recoveryReason).toBe(
            `the monitor is now up again. It ran successfully at ${moment(docs[0]['@timestamp'])
              .tz('UTC')
              .format('MMM D, YYYY @ HH:mm:ss.SSS')}`
          );
          expect(actionDoc?.recoveryStatus).toBe('is now up');
        });
      }
    );

    apiTest(
      'numberOfChecks - location threshold = 1 - grouped by location - 2 down locations',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        await clearActionIndex(esClient, env.alertActionIndex);

        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step('creates a monitor', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor location based at ${moment().format('LT')}`
          );
          expect(monitor.id).toBeDefined();
          createdMonitorIds.push(monitor.id);
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
                buildExpectedErrorLink(kibanaBaseUrl, monitor.id, locationId as string)
              );
            }
          }
        );
      }
    );
  }
);
