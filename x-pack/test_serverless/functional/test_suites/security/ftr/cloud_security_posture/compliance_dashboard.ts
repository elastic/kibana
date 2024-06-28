/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const pageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'cloudPostureDashboard',
    'header',
  ]);
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
    // TODO: we need to check if the tests are running on MKI. There is a suspicion that installing csp package via Kibana server args is not working on MKI.
    this.tags(['skipMKI', 'cloud_security_posture_compliance_dashboard']);
    let cspDashboard: typeof pageObjects.cloudPostureDashboard;
    let dashboard: typeof pageObjects.cloudPostureDashboard.dashboard;

    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('viewer');
      cspDashboard = pageObjects.cloudPostureDashboard;
      dashboard = pageObjects.cloudPostureDashboard.dashboard;
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
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('Kubernetes Dashboard', () => {
      it('displays accurate summary compliance score', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const scoreElement = await dashboard.getKubernetesComplianceScore();

        expect((await scoreElement.getVisibleText()) === '0%').to.be(true);
      });
    });
  });
}
