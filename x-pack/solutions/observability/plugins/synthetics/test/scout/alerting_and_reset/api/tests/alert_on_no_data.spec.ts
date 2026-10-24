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
  createCustomStatusRule,
  createStatusRuleTestEnv,
  makeSummaries,
  setupStatusRuleTestEnv,
  teardownStatusRuleTestEnv,
  waitForActionDocuments,
  waitForStatusAlert,
  waitUntilMonitorLocationsPending,
} from '../fixtures/status_rule_helper';

const SLOW_TEST_TIMEOUT_MS = 240_000;

/**
 * Ported from FTR
 * `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/alerting/synthetics/alert_on_no_data.ts`.
 *
 * Verifies that a custom monitor status rule with `alertOnNoData: true` and
 * `pendingThreshold: 1` fires one pending alert per location, then updates the
 * alert reason when a location transitions from pending to down and recovers
 * when a location transitions from pending to up.
 */
apiTest.describe(
  'SyntheticsAlertOnNoData',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('alert-on-no-data');
    const createdMonitorIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth, apiClient, apiServices, esClient, samlAuth }) => {
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
    });

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
      'triggers pending alerts per location, transitions pending to down, and recovers pending to up',
      async ({ apiClient, apiServices, esClient }) => {
        apiTest.setTimeout(SLOW_TEST_TIMEOUT_MS);

        let monitor: EncryptedSyntheticsSavedMonitor;
        let ruleId = '';
        const condition: StatusRuleParams['condition'] = {
          alertOnNoData: true,
          locationsThreshold: 1,
          window: {
            numberOfChecks: 5,
          },
          groupBy: 'locationId',
          downThreshold: 5,
          pendingThreshold: 1,
        };

        await apiTest.step('creates a monitor and custom rule', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor check based at ${moment().format('LLL')}`
          );
          expect(monitor.id).toBeDefined();
          createdMonitorIds.push(monitor.id);
          const params: StatusRuleParams = {
            condition,
            monitorIds: [monitor.id],
          };

          const rule = await createCustomStatusRule({
            apiServices,
            env,
            params,
            name: 'When down 5 times from 1 location, alert on no data',
          });
          ruleId = rule.id;
          expect(rule.params).toStrictEqual(params);
        });

        await apiTest.step('triggers 1 pending alert per location', async () => {
          await waitUntilMonitorLocationsPending({
            apiClient,
            editorHeaders: env.editorHeaders,
            monitorId: monitor.id,
            condition,
            expectedLocationCount: 2,
          });

          const [dev1Alert, dev2Alert] = await Promise.all([
            waitForStatusAlert({
              esClient,
              apiServices,
              ruleId,
              filters: [
                { term: { 'kibana.alert.status': 'active' } },
                { term: { 'location.id': 'dev' } },
              ],
            }),
            waitForStatusAlert({
              esClient,
              apiServices,
              ruleId,
              filters: [
                { term: { 'kibana.alert.status': 'active' } },
                { term: { 'location.id': 'dev2' } },
              ],
            }),
          ]);

          expect(dev1Alert.hits.hits).toHaveLength(1);
          expect(dev2Alert.hits.hits).toHaveLength(1);

          const dev1AlertSource = dev1Alert.hits.hits[0]._source;
          const dev2AlertSource = dev2Alert.hits.hits[0]._source;

          expect(dev1AlertSource?.['kibana.alert.reason']).toBe(
            `Monitor "${monitor.name}" from Dev Service is pending.`
          );
          expect(dev2AlertSource?.['kibana.alert.reason']).toBe(
            `Monitor "${monitor.name}" from Dev Service 2 is pending.`
          );

          const [dev1AlertAction, dev2AlertAction] = await Promise.all([
            waitForActionDocuments({
              esClient,
              indexName: env.alertActionIndex,
              filters: [{ term: { 'monitor.id': monitor.id } }, { term: { locationId: 'dev' } }],
            }),
            waitForActionDocuments({
              esClient,
              indexName: env.alertActionIndex,
              filters: [{ term: { 'monitor.id': monitor.id } }, { term: { locationId: 'dev2' } }],
            }),
          ]);

          expect(dev1AlertAction.hits.hits).toHaveLength(1);
          expect(dev2AlertAction.hits.hits).toHaveLength(1);

          const dev1AlertActionSource = dev1AlertAction.hits.hits[0]._source;
          const dev2AlertActionSource = dev2AlertAction.hits.hits[0]._source;

          expect(dev1AlertActionSource?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service is pending.`
          );
          expect(dev2AlertActionSource?.reason).toBe(
            `Monitor "${monitor.name}" from Dev Service 2 is pending.`
          );
          expect(dev1AlertActionSource?.linkMessage).toBe('');
          expect(dev2AlertActionSource?.linkMessage).toBe('');
          expect(dev1AlertActionSource?.locationNames).toBe('Dev Service');
          expect(dev2AlertActionSource?.locationNames).toBe('Dev Service 2');
        });

        await apiTest.step(
          'changes message when monitor goes from pending to down and recovers when pending goes to up',
          async () => {
            const [, recoveryDoc] = await Promise.all([
              makeSummaries({
                esClient,
                monitor,
                downChecks: 5,
                location: { id: 'dev', label: 'Dev Service' },
              }),
              makeSummaries({
                esClient,
                monitor,
                upChecks: 1,
                location: { id: 'dev2', label: 'Dev Service 2' },
              }),
            ]);

            const [dev1Alert, dev2AlertAction] = await Promise.all([
              waitForStatusAlert({
                esClient,
                apiServices,
                ruleId,
                filters: [
                  { term: { 'kibana.alert.status': 'active' } },
                  { term: { 'location.id': 'dev' } },
                  { wildcard: { 'kibana.alert.reason': { value: '*down*' } } },
                ],
              }),
              waitForActionDocuments({
                esClient,
                indexName: env.alertActionIndex,
                filters: [
                  { term: { 'monitor.id': monitor.id } },
                  { term: { locationId: 'dev2' } },
                  { term: { status: 'recovered' } },
                ],
              }),
            ]);

            expect(dev1Alert.hits.hits).toHaveLength(1);
            const dev1AlertSource = dev1Alert.hits.hits[0]._source;
            expect(dev1AlertSource?.['kibana.alert.reason']).toBe(
              `Monitor "${monitor.name}" from Dev Service is down. Monitor is down 5 times within the last 5 checks. Alert when 5 out of the last 5 checks are down from at least 1 location.`
            );

            expect(dev2AlertAction.hits.hits).toHaveLength(1);
            const dev2AlertActionSource = dev2AlertAction.hits.hits[0]._source;
            expect(dev2AlertActionSource?.recoveryStatus).toBe('is now up');
            expect(dev2AlertActionSource?.recoveryReason).toBe(
              `the monitor is now up again. It ran successfully at ${moment(
                recoveryDoc[0]['@timestamp']
              )
                .tz('UTC')
                .format('MMM D, YYYY @ HH:mm:ss.SSS')}`
            );
          }
        );
      }
    );
  }
);
