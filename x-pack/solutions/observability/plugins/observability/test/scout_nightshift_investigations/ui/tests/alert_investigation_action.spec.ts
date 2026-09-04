/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../../scout/ui/fixtures';
import { INVESTIGATE_ALERT_ROLE } from '../../../scout/ui/fixtures/roles';
import { mockInvestigationApi } from '../fixtures/mocks';

const suffix = randomUUID();
const alertId = `nightshift-investigation-alert-${suffix}`;
const ruleId = `nightshift-investigation-rule-${suffix}`;
const ruleName = `Nightshift investigation test rule ${suffix}`;
const alertIndex = '.alerts-observability.apm.alerts-default';

test.describe(
  'Observability alert investigation action',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ esClient }) => {
      const timestamp = new Date().toISOString();
      await esClient.create({
        index: alertIndex,
        id: alertId,
        refresh: 'wait_for',
        document: {
          '@timestamp': timestamp,
          'event.kind': 'signal',
          'kibana.alert.uuid': alertId,
          'kibana.alert.flapping': false,
          'kibana.alert.reason': 'Failed transaction rate exceeded the threshold',
          'kibana.alert.status': 'active',
          'kibana.alert.start': timestamp,
          'kibana.alert.time_range': { gte: timestamp },
          'kibana.alert.workflow_status': 'open',
          'kibana.alert.rule.category': 'Failed transaction rate threshold',
          'kibana.alert.rule.consumer': 'alerts',
          'kibana.alert.rule.name': ruleName,
          'kibana.alert.rule.producer': 'apm',
          'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
          'kibana.alert.rule.uuid': ruleId,
          'kibana.space_ids': ['default'],
          'kibana.version': '8.0.0',
        },
      });
    });

    test.beforeEach(async ({ browserAuth, page }) => {
      await mockInvestigationApi(page);
      await browserAuth.loginWithCustomRole(INVESTIGATE_ALERT_ROLE);
    });

    test.afterAll(async ({ esClient }) => {
      await esClient.deleteByQuery({
        index: alertIndex,
        query: { ids: { values: [alertId] } },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    test('sends an investigation request from an alert row action', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.alertsTablePage.gotoWithAppState({
        kuery: `kibana.alert.rule.uuid: "${ruleId}"`,
        rangeFrom: 'now-1h',
        rangeTo: 'now',
      });
      await expect
        .poll(() => pageObjects.alertsTablePage.getRowCount(), { timeout: 30_000 })
        .toBe(1);

      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await pageObjects.alertsTablePage.openActionsMenuForRow(0);
      await pageObjects.alertsTablePage.clickInvestigate();

      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: alertId },
      });
    });

    test('sends an investigation request from the alert detail action menu', async ({
      page,
      pageObjects,
    }) => {
      await pageObjects.alertPage.goto(alertId);
      await pageObjects.alertPage.openActionsMenu();

      const requestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' &&
          request.url().endsWith('/internal/nightshift/investigations')
      );
      await pageObjects.alertPage.clickInvestigate();

      expect((await requestPromise).postDataJSON()).toMatchObject({
        subject: { type: 'alert', id: alertId },
      });
    });
  }
);
