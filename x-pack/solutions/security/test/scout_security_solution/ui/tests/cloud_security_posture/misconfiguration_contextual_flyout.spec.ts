/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-security';
import { test, expect, tags } from '../../fixtures';
import { createRule, deleteAlertsAndRules } from '../../common/api_helpers';
import { indexDocument, deleteIndex } from '../../common/es_helpers';
import {
  CSP_INSIGHT_MISCONFIGURATION_TITLE,
  CSP_INSIGHT_TAB_TITLE,
  CSP_INSIGHT_MISCONFIGURATION_TABLE,
} from '../../common/constants';

const CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX =
  'security_solution-test.misconfiguration_latest';

const mockFindingHostName = (matches: boolean) => ({
  '@timestamp': new Date().toISOString(),
  host: { name: matches ? 'siem-kibana' : 'not-siem-kibana' },
  resource: {
    id: '1234ABCD',
    name: 'kubelet',
    sub_type: 'lower case sub type',
  },
  result: { evaluation: matches ? 'passed' : 'failed' },
  rule: {
    name: 'Upper case rule name',
    section: 'Upper case section',
    benchmark: {
      id: 'cis_k8s',
      posture_type: 'kspm',
      name: 'CIS Kubernetes V1.23',
      version: 'v1.0.0',
    },
    type: 'process',
  },
  cluster_id: 'Upper case cluster id',
  data_stream: {
    dataset: 'cloud_security_posture.findings',
  },
});

const mockFindingUserName = (matches: boolean) => ({
  '@timestamp': new Date().toISOString(),
  user: { name: matches ? 'test' : 'not-test' },
  resource: {
    id: '1234ABCD',
    name: 'kubelet',
    sub_type: 'lower case sub type',
  },
  result: { evaluation: matches ? 'passed' : 'failed' },
  rule: {
    name: 'Upper case rule name',
    section: 'Upper case section',
    benchmark: {
      id: 'cis_k8s',
      posture_type: 'kspm',
      name: 'CIS Kubernetes V1.23',
      version: 'v1.0.0',
    },
    type: 'process',
  },
  cluster_id: 'Upper case cluster id',
  data_stream: {
    dataset: 'cloud_security_posture.findings',
  },
});

async function putIndexMapping(esClient: EsClient): Promise<void> {
  await esClient.indices.create({
    index: CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX,
    body: {},
  });
  await esClient.indices.putMapping({
    index: CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX,
    properties: {
      'result.evaluation': { type: 'keyword' },
      'host.name': { type: 'keyword' },
      'resource.id': { type: 'keyword' },
      resource: {
        type: 'object',
        properties: {
          id: { type: 'keyword' },
          name: { type: 'keyword' },
          sub_type: { type: 'keyword' },
        },
      },
      rule: {
        type: 'object',
        properties: {
          name: { type: 'keyword' },
          section: { type: 'keyword' },
          benchmark: {
            type: 'object',
            properties: {
              id: { type: 'keyword' },
              posture_type: { type: 'keyword' },
              name: { type: 'keyword' },
              version: { type: 'keyword' },
            },
          },
        },
      },
    },
  });
}

// Skip on serverless: https://github.com/elastic/security-team/issues/12819
test.describe(
  'Alert Host details expandable flyout - Misconfiguration',
  { tag: tags.stateful.classic },
  () => {
    test.beforeEach(async ({ browserAuth, apiServices, pageObjects }) => {
      await deleteAlertsAndRules(apiServices);
      await browserAuth.loginAsAdmin();
      await createRule(apiServices, { name: `New Rule Test ${Date.now()}` });
      await pageObjects.securityCommon.navigateToAlerts();
      await pageObjects.securityCommon.waitForAlertsToPopulate();
    });

    test.describe('Host name - Has misconfiguration findings', () => {
      test.beforeEach(async ({ esClient, pageObjects, page }) => {
        await putIndexMapping(esClient);
        await indexDocument(
          esClient,
          CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX,
          mockFindingHostName(true)
        );
        await page.reload();
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();
      });

      test.afterEach(async ({ esClient }) => {
        try {
          await deleteIndex(esClient, CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX);
        } catch {
          // Cleanup best-effort
        }
      });

      test('should display Misconfiguration preview under Insights Entities when it has Misconfiguration Findings', async ({
        pageObjects,
      }) => {
        const misconfigurationTitle = pageObjects.securityCommon.testSubj(
          CSP_INSIGHT_MISCONFIGURATION_TITLE
        );
        await expect(misconfigurationTitle).toBeVisible();
      });

      test('should display insight tabs and findings table upon clicking on misconfiguration accordion', async ({
        pageObjects,
      }) => {
        await pageObjects.securityCommon.clickMisconfigurationTitle();
        const tabTitle = pageObjects.securityCommon.testSubj(CSP_INSIGHT_TAB_TITLE);
        const table = pageObjects.securityCommon.testSubj(CSP_INSIGHT_MISCONFIGURATION_TABLE);
        await expect(tabTitle).toBeVisible();
        await expect(table).toBeVisible();
      });
    });

    test.describe('Host name - Has misconfiguration findings but host name is not the same as alert host name', () => {
      test.beforeEach(async ({ esClient, pageObjects, page }) => {
        await putIndexMapping(esClient);
        await indexDocument(
          esClient,
          CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX,
          mockFindingHostName(false)
        );
        await page.reload();
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();
      });

      test.afterEach(async ({ esClient }) => {
        try {
          await deleteIndex(esClient, CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX);
        } catch {
          // Cleanup best-effort
        }
      });

      test('should not display Misconfiguration preview when host name does not match', async ({
        pageObjects,
      }) => {
        const misconfigurationTitle = pageObjects.securityCommon.testSubj(
          CSP_INSIGHT_MISCONFIGURATION_TITLE
        );
        await expect(misconfigurationTitle).not.toBeVisible();
      });
    });

    test.describe('User name - Has misconfiguration findings', () => {
      test.beforeEach(async ({ esClient, pageObjects, page }) => {
        await putIndexMapping(esClient);
        await indexDocument(
          esClient,
          CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX,
          mockFindingUserName(true)
        );
        await page.reload();
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertUserFlyout();
      });

      test.afterEach(async ({ esClient }) => {
        try {
          await deleteIndex(esClient, CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX);
        } catch {
          // Cleanup best-effort
        }
      });

      test('should display Misconfiguration preview under Insights Entities when it has Misconfiguration Findings', async ({
        pageObjects,
      }) => {
        const misconfigurationTitle = pageObjects.securityCommon.testSubj(
          CSP_INSIGHT_MISCONFIGURATION_TITLE
        );
        await expect(misconfigurationTitle).toBeVisible();
      });

      test('should display insight tabs and findings table upon clicking on misconfiguration accordion', async ({
        pageObjects,
      }) => {
        await pageObjects.securityCommon.clickMisconfigurationTitle();
        const tabTitle = pageObjects.securityCommon.testSubj(CSP_INSIGHT_TAB_TITLE);
        const table = pageObjects.securityCommon.testSubj(CSP_INSIGHT_MISCONFIGURATION_TABLE);
        await expect(tabTitle).toBeVisible();
        await expect(table).toBeVisible();
      });
    });

    test.describe('User name - Has misconfiguration findings but user name is not the same as alert user name', () => {
      test.beforeEach(async ({ esClient, pageObjects, page }) => {
        await putIndexMapping(esClient);
        await indexDocument(
          esClient,
          CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX,
          mockFindingUserName(false)
        );
        await page.reload();
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertUserFlyout();
      });

      test.afterEach(async ({ esClient }) => {
        try {
          await deleteIndex(esClient, CDR_MOCK_THIRD_PARTY_MISCONFIGURATION_LATEST_INDEX);
        } catch {
          // Cleanup best-effort
        }
      });

      test('should not display Misconfiguration preview when user name does not match', async ({
        pageObjects,
      }) => {
        const misconfigurationTitle = pageObjects.securityCommon.testSubj(
          CSP_INSIGHT_MISCONFIGURATION_TITLE
        );
        await expect(misconfigurationTitle).not.toBeVisible();
      });
    });
  }
);
