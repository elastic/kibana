/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// @ts-ignore
import { getLifecycleMethods } from '../../../functional/apps/monitoring/_get_lifecycle_methods';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const clusterList = getService('monitoringClusterList');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['monitoring']);
  const supertest = getService('supertest');
  const browser = getService('browser');

  describe('Cluster listing', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/multicluster', {
        from: 'Aug 15, 2017 @ 21:00:00.000',
        to: 'Aug 16, 2017 @ 00:00:00.000',
      });
    });

    after(async () => {
      await tearDown();

      const apiResponse = await supertest.get('/api/alerts/_find?per_page=20');
      const monitoringAlerts = apiResponse.body.data.filter(
        ({ consumer }: { consumer: string }) => consumer === 'monitoring'
      );

      await Promise.all(
        monitoringAlerts.map(async (alert) =>
          supertest.delete(`/api/alerts/alert/${alert.id}`).set('kbn-xsrf', 'true').expect(204)
        )
      );

      await browser.clearLocalStorage();
    });

    it('should show a toast when alerts are created successfully', async () => {
      await clusterList.acceptAlertsModal();
      expect(await testSubjects.exists('alertsCreatedToast', { timeout: 10000 })).to.be(true);
    });
  });
}
