/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import Chance from 'chance';
import type { FunctionalFtrProviderContext } from '../../common/ftr_provider_context';
import { setupCSPPackage } from '../../common/utils/csp_package_helpers';
import { addIndexDocs, deleteExistingIndex } from '../../common/utils/index_api_helpers';
import { FINDINGS_LATEST_INDEX } from '../../common/utils/indices';

// eslint-disable-next-line import/no-default-export
export default function ({ getPageObjects, getService }: FunctionalFtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const supertest = getService('supertest');
  const pageObjects = getPageObjects(['common', 'cloudPostureDashboard']);
  const chance = new Chance();
  const es = getService('es');

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

    before(async () => {
      cspDashboard = pageObjects.cloudPostureDashboard;
      dashboard = pageObjects.cloudPostureDashboard.dashboard;

      await setupCSPPackage(retry, log, supertest);

      await addIndexDocs(es, data, FINDINGS_LATEST_INDEX);

      await cspDashboard.navigateToComplianceDashboardPage();

      await retry.waitFor(
        'Cloud posture integration dashboard to be displayed',
        async () => !!dashboard.getIntegrationDashboardContainer()
      );
    });

    after(async () => {
      await deleteExistingIndex(es, FINDINGS_LATEST_INDEX);
    });

    describe('Kubernetes Dashboard', () => {
      it('displays accurate summary compliance score', async () => {
        const scoreElement = await dashboard.getKubernetesComplianceScore();

        expect((await scoreElement.getVisibleText()) === '0%').to.be(true);
      });
    });
  });
}
