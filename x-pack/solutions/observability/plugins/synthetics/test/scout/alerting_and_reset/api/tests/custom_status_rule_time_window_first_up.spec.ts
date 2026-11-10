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
 * Covers a `time` window custom status rule with `groupBy: 'locationId'`,
 * location threshold = 1 and the `firstUp` recovery strategy.
 */
apiTest.describe(
  'SyntheticsCustomStatusRule — time window, firstUp recovery',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('time-window-first-up');

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
      'timeWindow - location threshold = 1 - grouped by location - 1 down location - firstUp recovery mode',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);
        let ruleId = '';
        let monitor: EncryptedSyntheticsSavedMonitor;

        await apiTest.step('creates a monitor and custom rule with time-based window', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor time based at ${moment().format('LT')} - firstUp`
          );
          expect(monitor.id).toBeDefined();
          env.monitorIds.push(monitor.id);

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
            buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
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
            buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
          );
          expect(actionDoc?.locationId).toBe('dev');
        });
      }
    );
  }
);
