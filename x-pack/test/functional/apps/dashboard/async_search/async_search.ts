/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'header', 'dashboard', 'visChart']);

  describe('dashboard with async search', () => {
    it('not delayed should load', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.gotoDashboardEditMode('Not Delayed');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('embeddableErrorLabel');
      const data = await PageObjects.visChart.getBarChartData('Sum of bytes');
      expect(data.length).to.be(5);
    });

    it('delayed should load', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.gotoDashboardEditMode('Delayed 5s');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('embeddableErrorLabel');
      const data = await PageObjects.visChart.getBarChartData('');
      expect(data.length).to.be(5);
    });

    it('timed out should show error', async () => {
      await PageObjects.common.navigateToApp('dashboard');
      await PageObjects.dashboard.gotoDashboardEditMode('Delayed 15s');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('embeddableErrorLabel');
      await testSubjects.existOrFail('searchTimeoutError');
    });
  });
}
