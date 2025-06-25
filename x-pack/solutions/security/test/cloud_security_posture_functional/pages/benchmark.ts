/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { k8sFindingsMock } from '../mocks/latest_findings_mock';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const pageObjects = getPageObjects([
    'common',
    'cspSecurity',
    'cloudPostureDashboard',
    'rule',
    'benchmark',
    'findings',
  ]);

  describe('Access with custom roles', async () => {
    let cspSecurity = pageObjects.cspSecurity;
    let rule: typeof pageObjects.rule;
    let benchmark: typeof pageObjects.benchmark;
    let findings: typeof pageObjects.findings;

    before(async () => {
      benchmark = pageObjects.benchmark;
      cspSecurity = pageObjects.cspSecurity;
      await benchmark.waitForPluginInitialized();
      await kibanaServer.savedObjects.clean({
        types: ['cloud-security-posture-settings'],
      });
    });

    // Blocked by https://github.com/elastic/kibana/issues/184621
    it.skip('Access with valid user role', async () => {
      await cspSecurity.logout();
      await cspSecurity.login('csp_read_user');
      await benchmark.navigateToBenchnmarkPage();
      expect(await benchmark.benchmarkPage.doesBenchmarkTableExists());
    });

    // Blocked by https://github.com/elastic/kibana/issues/184621
    it.skip('Access with invalid user role', async () => {});

    // The entire describe block bellow should move to rule.ts byt the page test is blocked by:
    // FLAKY: https://github.com/elastic/kibana/issues/178413
    describe('Access with custom roles - rule page', async () => {
      before(async () => {
        findings = pageObjects.findings;
        rule = pageObjects.rule;
        await findings.index.add(k8sFindingsMock);
      });
      after(async () => {
        await findings.index.remove();
      });

      afterEach(async () => {
        // force logout to prevent the next test from failing
        await cspSecurity.logout();
      });

      it('Access with valid user role', async () => {
        await cspSecurity.logout();
        await cspSecurity.login('csp_read_user');
        await rule.navigateToRulePage('cis_k8s', '1.0.1');

        expect(await rule.rulePage.toggleBulkActionButton());
      });

      // Blocked by https://github.com/elastic/kibana/issues/184621
      it.skip('Access with invalid user role', async () => {});
    });
  });
}
