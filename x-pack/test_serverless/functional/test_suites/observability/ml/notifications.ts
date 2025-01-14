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

  const expectedObservabilityTypeFilters = ['Anomaly Detection', 'Inference', 'System'];

  describe('Notifications page', function () {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    it('displays only notification types for observability projects', async () => {
      await svlMl.navigation.observability.navigateToNotifications();
      const availableTypeFilters = await ml.notifications.getAvailableTypeFilters();

      expect(availableTypeFilters).to.eql(expectedObservabilityTypeFilters);
    });
  });
}
