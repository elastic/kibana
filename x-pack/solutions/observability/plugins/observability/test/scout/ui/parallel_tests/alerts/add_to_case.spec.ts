/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import { GENERATED_METRICS } from '../../fixtures/constants';

// Use current time for alert querying
const now = Date.now();
const DATE_WITH_DATA = {
  rangeFrom: new Date(now - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  rangeTo: new Date(now + 5 * 60 * 1000).toISOString(), // 5 minutes in the future
};

/**
 * Defines a custom role for observability with specified case privileges
 */
const defineObservabilityRoleWithCasePrivileges = (casePrivileges: string[]): KibanaRole => {
  return {
    elasticsearch: {
      cluster: ['all'],
      indices: [
        { names: ['filebeat-*', 'logs-*', 'metrics-*'], privileges: ['all'] },
        { names: ['.alerts-observability*'], privileges: ['read', 'view_index_metadata'] },
      ],
    },
    kibana: [
      {
        spaces: ['*'],
        base: [],
        feature: {
          observabilityCasesV3: casePrivileges,
          logs: ['all'],
        },
      },
    ],
  };
};

test.describe('Observability alerts - Add to case', { tag: ['@ess', '@svlOblt'] }, () => {
  let ruleId: string;

  const alertName = `Write bytes test rule ${Date.now()}`;

  test.beforeAll(async ({ apiServices }) => {
    const createdRule = (await apiServices.alerting.rules.create({
      tags: [],
      params: {
        criteria: [
          {
            comparator: '>',
            metrics: [
              {
                name: 'A',
                field: GENERATED_METRICS.metricName,
                aggType: 'max',
              },
            ],
            threshold: [100],
            timeSize: 1,
            timeUnit: 'd',
          },
        ],
        alertOnNoData: false,
        alertOnGroupDisappear: false,
        searchConfiguration: {
          query: {
            query: '',
            language: 'kuery',
          },
          index: 'metrics-*',
        },
      },
      schedule: {
        interval: '1m',
      },
      consumer: 'alerts',
      name: alertName,
      ruleTypeId: 'observability.rules.custom_threshold',
      actions: [],
    })) as { data: { id: string } };
    ruleId = createdRule.data.id;
  });

  test.afterEach(async ({ apiServices, log }) => {
    // Clean up any cases created during tests
    log.info('Cleaning up test cases...');
    try {
      await apiServices.cases.cleanup.deleteAllCases();
    } catch (error) {
      log.error(`Failed to cleanup cases: ${error}`);
    }
  });

  test.afterAll(async ({ apiServices, log }) => {
    // Clean up the created rule
    if (ruleId) {
      log.info(`Cleaning up rule ${ruleId}...`);
      try {
        await apiServices.alerting.rules.delete(ruleId);
      } catch (error) {
        log.error(`Failed to delete rule: ${error}`);
      }
    }
  });

  test('renders case options when user has all privileges', async ({
    browserAuth,
    pageObjects,
  }) => {
    const roleWithAllPrivileges = defineObservabilityRoleWithCasePrivileges(['all']);
    await browserAuth.loginWithCustomRole(roleWithAllPrivileges);
    await pageObjects.alertsPage.goto(DATE_WITH_DATA.rangeFrom, DATE_WITH_DATA.rangeTo);
    await pageObjects.alertsPage.waitForTableToLoad();
    await pageObjects.alertsPage.waitForAlertRows(1);

    await pageObjects.alertsPage.openActionsMenuForRow(0);

    expect(await pageObjects.alertsPage.isAddToExistingCaseActionVisible()).toBe(true);
    expect(await pageObjects.alertsPage.isAddToNewCaseActionVisible()).toBe(true);
  });

  test('opens flyout when "Add to new case" is clicked', async ({ browserAuth, pageObjects }) => {
    await expect(async () => {
      const roleWithAllPrivileges = defineObservabilityRoleWithCasePrivileges(['all']);
      await browserAuth.loginWithCustomRole(roleWithAllPrivileges);
      await pageObjects.alertsPage.goto(DATE_WITH_DATA.rangeFrom, DATE_WITH_DATA.rangeTo);
      await pageObjects.alertsPage.waitForTableToLoad();
      await pageObjects.alertsPage.waitForAlertRows(1);

      await pageObjects.alertsPage.openActionsMenuForRow(0);
      await pageObjects.alertsPage.clickAddToNewCase();

      expect(await pageObjects.alertsPage.isCreateCaseFlyoutVisible()).toBe(true);

      // Clean up by closing the flyout
      await pageObjects.alertsPage.closeFlyout();
    }).toPass({ timeout: 60_000, intervals: [2_000] });
  });

  test('opens modal when "Add to existing case" is clicked', async ({
    browserAuth,
    pageObjects,
  }) => {
    const roleWithAllPrivileges = defineObservabilityRoleWithCasePrivileges(['all']);
    await browserAuth.loginWithCustomRole(roleWithAllPrivileges);
    await pageObjects.alertsPage.goto(DATE_WITH_DATA.rangeFrom, DATE_WITH_DATA.rangeTo);
    await pageObjects.alertsPage.waitForTableToLoad();
    await pageObjects.alertsPage.waitForAlertRows(1);

    await pageObjects.alertsPage.openActionsMenuForRow(0);
    await pageObjects.alertsPage.clickAddToExistingCase();

    expect(await pageObjects.alertsPage.isAddToExistingCaseModalVisible()).toBe(true);
  });

  test('does not render case options when user has read permissions', async ({
    browserAuth,
    pageObjects,
  }) => {
    const roleWithReadPrivileges = defineObservabilityRoleWithCasePrivileges(['read']);
    await browserAuth.loginWithCustomRole(roleWithReadPrivileges);
    await pageObjects.alertsPage.goto(DATE_WITH_DATA.rangeFrom, DATE_WITH_DATA.rangeTo);
    await pageObjects.alertsPage.waitForTableToLoad();
    await pageObjects.alertsPage.waitForAlertRows(1);

    await pageObjects.alertsPage.openActionsMenuForRow(0);

    expect(await pageObjects.alertsPage.isAddToExistingCaseActionVisible()).toBe(false);
    expect(await pageObjects.alertsPage.isAddToNewCaseActionVisible()).toBe(false);
  });
});
