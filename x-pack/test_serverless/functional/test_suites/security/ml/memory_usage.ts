/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const ml = getService('ml');
  const svlMl = getService('svlMl');
  const PageObjects = getPageObjects(['svlCommonPage']);

  const availableSecurityIndicies = [
    'Anomaly detection jobs',
    'Data frame analytics jobs',
    'Trained models',
  ];

  describe('Memory usage page', function () {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    it('opens page with all available security indicies selected', async () => {
      await ml.navigation.navigateToMl();
      await svlMl.navigation.security.navigateToMemoryUsage();

      await ml.memoryUsage.assertJobTreeComboBoxExists();

      const selectedItems = await ml.memoryUsage.getSelectedChartItems();
      expect(selectedItems).to.eql(availableSecurityIndicies);

      // Make sure there are no other available indicies
      const options = await ml.memoryUsage.getJobTreeComboBoxOptions();
      expect(options).empty();
    });
  });
}
