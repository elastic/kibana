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
  const overview = getService('monitoringClusterOverview');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['monitoring', 'common']);
  const supertest = getService('supertest');
  const browser = getService('browser');
  const setupMode = getService('monitoringSetupMode');

  describe('Cluster overview', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/singlecluster_green_gold', {
        from: 'Aug 23, 2017 @ 21:29:35.267',
        to: 'Aug 23, 2017 @ 21:47:25.556',
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
    });

    describe('when create alerts options is selected in the alerts modal', () => {
      before(async () => {
        await overview.acceptAlertsModal();
      });

      it('should show a toast when alerts are created successfully', async () => {
        expect(await testSubjects.exists('alertsCreatedToast', { timeout: 10000 })).to.be(true);
      });

      it.skip('should show badges when entering setup mode', async () => {
        await setupMode.clickSetupModeBtn();
        await PageObjects.common.sleep(10000);
        expect(await testSubjects.exists('alertsBadge')).to.be(true);
      });
    });
  });
}
