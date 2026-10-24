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
  ageOutOldestDownCheck,
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
 * Covers `time` window custom status rules with `groupBy: 'locationId'`
 * (location threshold = 1 with default and `firstUp` recovery strategies, and
 * location threshold = 2 with 2 down locations).
 */
apiTest.describe(
  'SyntheticsCustomStatusRule — time window',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('time-window');
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
      'timeWindow - location threshold = 1 - grouped by location - 1 down location',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        await clearActionIndex(esClient, env.alertActionIndex);
        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step('creates a monitor and custom rule with time-based window', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor time based at ${moment().format('LT')}`
          );
          expect(monitor.id).toBeDefined();
          createdMonitorIds.push(monitor.id);

          const params: StatusRuleParams = {
            condition: {
              locationsThreshold: 1,
              window: {
                time: {
                  unit: 'm',
                  size: 5,
                },
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
            name: 'Status based on checks in a time window',
          });
          expect(rule.id).toBeDefined();
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
            filters: [{ term: { 'monitor.id': monitor.id } }],
          });

          const alert = response.hits.hits[0]?._source;
          expect(alert?.['kibana.alert.status']).toBe('active');
          expect(alert?.['kibana.alert.reason']).toBe(
            `Monitor "${monitor.name}" from Dev Service is down. Alert when 5 checks are down within the last 5 minutes from at least 1 location.`
          );

          const downResponse = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }],
          });
          const actionDoc = downResponse.hits.hits[0]?._source;
          expect(actionDoc?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service is down. Alert when 5 checks are down within the last 5 minutes from at least 1 location.`
          );
          expect(actionDoc?.locationNames).toBe('Dev Service');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev');
        });

        await apiTest.step('triggers recovered alert', async () => {
          await ageOutOldestDownCheck({
            esClient,
            monitorId: monitor.id,
            locationId: 'dev',
          });

          const response = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'recovered' } },
              { term: { 'monitor.id': monitor.id } },
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
            `Monitor "${monitor.name}" from Dev Service is recovered. Alert when 5 checks are down within the last 5 minutes from at least 1 location.`
          );
          expect(actionDoc?.recoveryReason).toBe('the alert condition is no longer met');
          expect(actionDoc?.recoveryStatus).toBe('has recovered');
          expect(actionDoc?.locationNames).toBe('Dev Service');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev');
        });
      }
    );

    apiTest(
      'timeWindow - location threshold = 1 - grouped by location - 1 down location - firstUp recovery mode',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        await clearActionIndex(esClient, env.alertActionIndex);
        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step('creates a monitor and custom rule with time-based window', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor time based at ${moment().format('LT')} - firstUp`
          );
          expect(monitor.id).toBeDefined();
          createdMonitorIds.push(monitor.id);

          const params: StatusRuleParams = {
            condition: {
              locationsThreshold: 1,
              window: {
                time: {
                  unit: 'm',
                  size: 5,
                },
              },
              groupBy: 'locationId',
              downThreshold: 1,
              recoveryStrategy: 'firstUp',
            },
            monitorIds: [monitor.id],
          };
          const rule = await createCustomStatusRule({
            apiServices,
            env,
            params,
            name: 'Status based on checks in a time window - firstUp recovery mode',
          });
          expect(rule.id).toBeDefined();
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
            filters: [{ term: { 'monitor.id': monitor.id } }],
          });

          const alert = response.hits.hits[0]?._source;
          expect(alert?.['kibana.alert.status']).toBe('active');
          expect(alert?.['kibana.alert.reason']).toBe(
            `Monitor "${monitor.name}" from Dev Service is down. Alert when 1 checks are down within the last 5 minutes from at least 1 location.`
          );

          const downResponse = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }],
          });
          const actionDoc = downResponse.hits.hits[0]?._source;
          expect(actionDoc?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service is down. Alert when 1 checks are down within the last 5 minutes from at least 1 location.`
          );
          expect(actionDoc?.locationNames).toBe('Dev Service');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev');
        });

        await apiTest.step('triggers recovered alert', async () => {
          const upCheckDocs = await makeSummaries({
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
            `Monitor "${monitor.name}" from Dev Service is recovered. Alert when 1 checks are down within the last 5 minutes from at least 1 location.`
          );
          expect(actionDoc?.recoveryReason).toBe(
            `the monitor is now up again. It ran successfully at ${moment(
              upCheckDocs[0]['@timestamp']
            )
              .tz('UTC')
              .format('MMM D, YYYY @ HH:mm:ss.SSS')}`
          );
          expect(actionDoc?.recoveryStatus).toBe('is now up');
          expect(actionDoc?.locationNames).toBe('Dev Service');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev');
        });
      }
    );

    apiTest(
      'timeWindow - location threshold = 2 - grouped by location - 2 down locations',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        await clearActionIndex(esClient, env.alertActionIndex);

        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step('creates a monitor and custom rule with time-based window', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor time based at ${moment().format('LT')} grouped 2 locations`
          );
          expect(monitor.id).toBeDefined();
          createdMonitorIds.push(monitor.id);

          const params: StatusRuleParams = {
            condition: {
              window: {
                time: {
                  unit: 'm',
                  size: 5,
                },
              },
              groupBy: 'locationId',
              locationsThreshold: 2,
              downThreshold: 5,
            },
            monitorIds: [monitor.id],
          };
          const rule = await createCustomStatusRule({
            apiServices,
            env,
            params,
            name: 'Status based on checks in a time window when down from 2 locations',
          });
          expect(rule.id).toBeDefined();
          ruleId = rule.id;
          expect(rule.params).toStrictEqual(params);
        });

        await apiTest.step('triggers down alert and alert action', async () => {
          await makeSummaries({
            esClient,
            monitor,
            downChecks: 5,
            location: monitor.locations[0],
          });
          await makeSummaries({
            esClient,
            monitor,
            downChecks: 5,
            location: monitor.locations[1],
          });

          const response = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [{ term: { 'monitor.id': monitor.id } }],
          });

          const alert = response.hits.hits[0]?._source;
          expect(alert?.['kibana.alert.status']).toBe('active');
          expect(alert?.['kibana.alert.reason']).toBe(
            `Monitor "${monitor.name}" is down 5 times from Dev Service and 5 times from Dev Service 2. Alert when down 5 times within the last 5 minutes from at least 2 locations.`
          );

          const downResponse = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }],
          });
          const actionDoc = downResponse.hits.hits[0]?._source;
          expect(actionDoc?.reason).toBe(
            `Monitor "${monitor.name}" is down 5 times from Dev Service and 5 times from Dev Service 2. Alert when down 5 times within the last 5 minutes from at least 2 locations.`
          );
          expect(actionDoc?.locationNames).toBe('Dev Service and Dev Service 2');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev and dev2');
        });

        await apiTest.step('triggers recovered alert', async () => {
          await ageOutOldestDownCheck({
            esClient,
            monitorId: monitor.id,
            locationId: 'dev',
          });

          const response = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'recovered' } },
              { term: { 'monitor.id': monitor.id } },
            ],
          });
          expect(response.hits.hits[0]?._source?.['kibana.alert.status']).toBe('recovered');

          const recoveryAction = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'recovered' } }],
          });
          const actionDoc = recoveryAction.hits.hits[0]?._source;
          expect(actionDoc?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service and Dev Service 2 is recovered. Alert when 5 checks are down within the last 5 minutes from at least 2 locations.`
          );
          expect(actionDoc?.recoveryReason).toBe('the alert condition is no longer met');
          expect(actionDoc?.recoveryStatus).toBe('has recovered');
          expect(actionDoc?.locationNames).toBe('Dev Service and Dev Service 2');
          expect(actionDoc?.linkMessage).toBe(
            buildExpectedErrorLink(kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev and dev2');
        });
      }
    );
  }
);
