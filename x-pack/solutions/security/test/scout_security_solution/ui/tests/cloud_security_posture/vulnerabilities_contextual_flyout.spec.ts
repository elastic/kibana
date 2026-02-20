/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { test, expect, tags } from '../../fixtures';
import { createRule, deleteAlertsAndRules } from '../../common/api_helpers';
import { indexDocument, deleteDataStream } from '../../common/es_helpers';
import {
  CSP_INSIGHT_VULNERABILITIES_TITLE,
  CSP_INSIGHT_VULNERABILITIES_TABLE,
} from '../../common/constants';

const getMockVulnerability = (isNameMatchesAlert: boolean) => {
  const iso8601String = new Date().toISOString();
  return {
    '@timestamp': iso8601String,
    resource: { name: '634yfsdg2.dkr.ecr.eu-central-1.amazon.stage', id: 'ami_12328' },
    agent: {
      name: 'ip-172-31-33-74',
      type: 'cloudbeat',
      version: '8.8.0',
      ephemeral_id: '49f19e6a-94e9-4f2b-81e3-2f3794a74068',
      id: 'd0313a94-c168-4d95-b1f0-97a388dac29a',
    },
    cloud: {
      availability_zone: 'eu-west-1c',
      service: { name: 'EC2' },
      account: { id: '704479110758' },
      image: { id: 'ami-02dc8dbcc971f2c74' },
      provider: 'aws',
      instance: { id: 'i-0fb7759c6e5d400cf' },
      machine: { type: 'c6g.medium' },
      region: 'eu-west-1',
    },
    package: { fixed_version: '0.4.0', version: 'v0.2.0', name: 'golang.org/x/net' },
    vulnerability: {
      published_date: '2022-08-10T00:00:00.000Z',
      data_source: {
        ID: 'go-vulndb',
        Name: 'The Go Vulnerability Database',
        URL: 'https://github.com/golang/vulndb',
      },
      enumeration: 'CVE',
      description:
        'An attacker can cause excessive memory growth in a Go server accepting HTTP/2 requests.',
      title:
        'golang: net/http: An attacker can cause excessive memory growth in a Go server accepting HTTP/2 requests',
      reference: 'https://avd.aquasec.com/nvd/cve-2022-41717',
      severity: 'MEDIUM',
      cvss: {
        nvd: { V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L', V3Score: 5.3 },
        redhat: { V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L', V3Score: 5.3 },
        ghsa: { V3Vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L', V3Score: 5.3 },
      },
      scanner: { vendor: 'Trivy' },
      score: { base: 5.3, version: '3.0' },
      cwe: ['CWE-770'],
      id: 'CVE-2022-41717',
      classification: 'CVSS',
    },
    host: {
      name: isNameMatchesAlert ? 'siem-kibana' : 'not-siem-kibana',
      id: 'ec2644f440799ed0cf8aa595a9a105cc',
      hostname: 'ip-172-31-33-74',
    },
    data_stream: {
      dataset: 'cloud_security_posture.vulnerabilities',
    },
  };
};

test.describe(
  'Alert Host details expandable flyout - Vulnerabilities',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(
      async ({ browserAuth, apiServices, pageObjects, page }) => {
        await deleteAlertsAndRules(apiServices);
        await browserAuth.loginAsAdmin();
        await createRule(apiServices, { name: `New Rule Test ${Date.now()}` });
        await pageObjects.securityCommon.navigateToAlerts();
        await pageObjects.securityCommon.waitForAlertsToPopulate();
      }
    );

    test('should not display Vulnerabilities preview under Insights Entities when it does not have Vulnerabilities Findings', async ({
      pageObjects,
    }) => {
      await pageObjects.securityCommon.expandFirstAlertHostFlyout();

      const vulnerabilitiesTitle = pageObjects.securityCommon.testSubj(
        CSP_INSIGHT_VULNERABILITIES_TITLE
      );
      await expect(vulnerabilitiesTitle).not.toBeVisible();
    });

    test.describe(
      'Host name - Has Vulnerabilities findings but with different host name than the alerts',
      () => {
        test.beforeEach(async ({ esClient, pageObjects, page }) => {
          await indexDocument(
            esClient,
            CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
            getMockVulnerability(false)
          );
          await page.reload();
          await pageObjects.securityCommon.waitForAlertsToPopulate();
          await pageObjects.securityCommon.expandFirstAlertHostFlyout();
        });

        test.afterEach(async ({ esClient }) => {
          try {
            await deleteDataStream(esClient, CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN);
          } catch {
            // Cleanup best-effort
          }
        });

        test('should not display Vulnerabilities preview when host name does not match', async ({
          pageObjects,
        }) => {
          const vulnerabilitiesTitle = pageObjects.securityCommon.testSubj(
            CSP_INSIGHT_VULNERABILITIES_TITLE
          );
          await expect(vulnerabilitiesTitle).not.toBeVisible();
        });
      }
    );

    test.describe('Host name - Has Vulnerabilities findings', () => {
      test.beforeEach(async ({ esClient, pageObjects, page }) => {
        await indexDocument(
          esClient,
          CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
          getMockVulnerability(true)
        );
        await page.reload();
        await pageObjects.securityCommon.waitForAlertsToPopulate();
        await pageObjects.securityCommon.expandFirstAlertHostFlyout();
      });

      test.afterEach(async ({ esClient }) => {
        try {
          await deleteDataStream(esClient, CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN);
        } catch {
          // Cleanup best-effort
        }
      });

      test('should display Vulnerabilities preview under Insights Entities when it has Vulnerabilities Findings', async ({
        pageObjects,
      }) => {
        const vulnerabilitiesTitle = pageObjects.securityCommon.testSubj(
          CSP_INSIGHT_VULNERABILITIES_TITLE
        );
        await expect(vulnerabilitiesTitle).toBeVisible();
      });

      test('should display insight tabs and findings table upon clicking on vulnerabilities accordion', async ({
        pageObjects,
      }) => {
        const vulnerabilitiesTitle = pageObjects.securityCommon.testSubj(
          CSP_INSIGHT_VULNERABILITIES_TITLE
        );
        await vulnerabilitiesTitle.click();

        const vulnerabilitiesTable = pageObjects.securityCommon.testSubj(
          CSP_INSIGHT_VULNERABILITIES_TABLE
        );
        await expect(vulnerabilitiesTable).toBeVisible();
      });
    });
  }
);
