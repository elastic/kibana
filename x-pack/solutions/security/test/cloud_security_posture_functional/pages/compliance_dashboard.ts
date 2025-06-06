/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const pageObjects = getPageObjects(['common', 'cspSecurity', 'cloudPostureDashboard', 'header']);
  const chance = new Chance();

  const data = [
    {
      '@timestamp': new Date().toISOString(),
      resource: { id: chance.guid(), name: `kubelet`, sub_type: 'lower case sub type' },
      result: { evaluation: 'failed' },
      rule: {
        name: 'Upper case rule name',
        section: 'Upper case section',
        benchmark: {
          id: 'cis_k8s',
          posture_type: 'kspm',
        },
      },
      cluster_id: 'Upper case cluster id',
    },
  ];

  describe('Cloud Posture Dashboard Page', function () {
    this.tags(['cloud_security_posture_compliance_dashboard']);
    let cspDashboard: typeof pageObjects.cloudPostureDashboard;
    let dashboard: typeof pageObjects.cloudPostureDashboard.dashboard;
    let cspSecurity = pageObjects.cspSecurity;

    before(async () => {
      cspDashboard = pageObjects.cloudPostureDashboard;
      dashboard = pageObjects.cloudPostureDashboard.dashboard;
      cspSecurity = pageObjects.cspSecurity;

      await cspDashboard.waitForPluginInitialized();

      await cspDashboard.index.add(data);
      await cspDashboard.navigateToComplianceDashboardPage();
      await retry.waitFor(
        'Cloud posture integration dashboard to be displayed',
        async () => !!dashboard.getIntegrationDashboardContainer()
      );
    });

    after(async () => {
      await cspDashboard.index.remove();
    });

    describe('Kubernetes Dashboard', () => {
      it('displays accurate summary compliance score', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const scoreElement = await dashboard.getKubernetesComplianceScore();

        expect((await scoreElement.getVisibleText()) === '0%').to.be(true);
      });
    });

    // describe('TODO - Cloud Dashboard', () => {
    //   it('todo - displays accurate summary compliance score', async () => {});
    // });

    describe('Access with custom roles', async () => {
      this.afterEach(async () => {
        // force logout to prevent the next test from failing
        await cspSecurity.logout();
      });
      it('Access with valid user role', async () => {
        await cspSecurity.logout();
        await cspSecurity.login('csp_read_user');
        await cspDashboard.navigateToComplianceDashboardPage();
        await retry.waitFor(
          'Cloud posture integration dashboard to be displayed',
          async () => !!dashboard.getIntegrationDashboardContainer()
        );
        const scoreElement = await dashboard.getKubernetesComplianceScore();

        expect((await scoreElement.getVisibleText()) === '0%').to.be(true); // based on the ingested findings
      });

      // Blocked by https://github.com/elastic/kibana/issues/184621
      it.skip('todo - Access with invalid user role', async () => {});
    });
  });
}
