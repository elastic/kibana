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
 * and 1 location down, including recovery.
 */
apiTest.describe(
  'SyntheticsCustomStatusRule — numberOfChecks grouped, 1 down location',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('checks-grouped-one-location');

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
          env.monitorIds.push(monitor.id);

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
            buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
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
            buildExpectedErrorLink(env.kibanaBaseUrl, monitor.id, 'dev')
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
  }
);
