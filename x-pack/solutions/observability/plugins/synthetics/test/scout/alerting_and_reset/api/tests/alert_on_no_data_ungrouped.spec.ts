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
  DEV_LOCATIONS,
  addTestMonitor,
  createCustomStatusRule,
  makeSummaries,
  createStatusRuleTestEnv,
  setupStatusRuleTestEnv,
  teardownStatusRuleTestEnv,
  waitForActionDocuments,
  waitForStatusAlert,
  waitUntilMonitorLocationsPending,
} from '../fixtures/status_rule_helper';

const SLOW_TEST_TIMEOUT_MS = 240_000;

const LOCATION_LABELS = DEV_LOCATIONS.map(({ label }) => label).sort();

// Ungrouped alerts join location names with " and "; their order follows the evaluation order.
const splitLocationNames = (locationNames?: string) => (locationNames ?? '').split(' and ').sort();

/**
 * Verifies that a custom monitor status rule with `alertOnNoData: true` and
 * `groupBy: 'none'` reports a single pending alert that names every pending
 * location by its label, both in the alert document and in the action context,
 * and keeps those labels when the alert recovers.
 */
apiTest.describe(
  'SyntheticsAlertOnNoData — ungrouped',
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    const env = createStatusRuleTestEnv('alert-on-no-data-ungrouped');

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
      'names every pending location by label and keeps the labels on recovery',
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
          groupBy: 'none',
          downThreshold: 5,
          pendingThreshold: 1,
        };

        await apiTest.step('creates a monitor and an ungrouped custom rule', async () => {
          monitor = await addTestMonitor(
            apiClient,
            env.editorHeaders,
            `Monitor ungrouped no data at ${moment().format('LLL')}`
          );
          expect(monitor.id).toBeDefined();
          env.monitorIds.push(monitor.id);

          const rule = await createCustomStatusRule({
            apiServices,
            env,
            params: { condition, monitorIds: [monitor.id] },
            name: 'Ungrouped, alert on no data',
          });
          ruleId = rule.id;
        });

        await apiTest.step('reports one pending alert naming both locations', async () => {
          await waitUntilMonitorLocationsPending({
            apiClient,
            cookieHeaders: env.editorCookieHeaders,
            monitorId: monitor.id,
            condition,
            expectedLocationCount: 2,
          });

          const alert = await waitForStatusAlert({
            esClient,
            apiServices,
            ruleId,
            filters: [
              { term: { 'kibana.alert.status': 'active' } },
              { term: { 'monitor.id': monitor.id } },
            ],
          });
          expect(alert.hits.hits).toHaveLength(1);
          const alertSource = alert.hits.hits[0]._source as Record<string, unknown>;
          expect([alertSource['observer.geo.name']].flat().sort()).toStrictEqual(LOCATION_LABELS);
          expect([alertSource['location.name']].flat().sort()).toStrictEqual(LOCATION_LABELS);

          const action = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'active' } }],
          });
          expect(action.hits.hits).toHaveLength(1);
          expect(splitLocationNames(action.hits.hits[0]._source?.locationNames)).toStrictEqual(
            LOCATION_LABELS
          );
        });

        await apiTest.step('keeps the location labels when the alert recovers', async () => {
          await Promise.all(
            DEV_LOCATIONS.map((location) =>
              makeSummaries({
                esClient,
                monitor,
                upChecks: 1,
                location: { id: location.id, label: location.label },
              })
            )
          );
          await apiServices.alerting.rules.runSoon(ruleId);

          const recovery = await waitForActionDocuments({
            esClient,
            indexName: env.alertActionIndex,
            filters: [{ term: { 'monitor.id': monitor.id } }, { term: { status: 'recovered' } }],
            timeoutMs: 120_000,
          });
          expect(recovery.hits.hits).toHaveLength(1);
          const recoverySource = recovery.hits.hits[0]._source;
          expect(splitLocationNames(recoverySource?.locationNames)).toStrictEqual(LOCATION_LABELS);
          expect(recoverySource?.recoveryStatus).toBe('is now up');
        });
      }
    );
  }
);
