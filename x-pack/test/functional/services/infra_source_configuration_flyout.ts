/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export function InfraSourceConfigurationFlyoutProvider({
  getService,
}: KibanaFunctionalTestDefaultProviders) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  return {
    async getNameInput() {
      return await testSubjects.find('nameInput');
    },

    async getLogIndicesInput() {
      return await testSubjects.find('logIndicesInput');
    },

    async getMetricIndicesInput() {
      return await testSubjects.find('metricIndicesInput');
    },

    async saveConfiguration() {
      await testSubjects.click('updateSourceConfigurationButton');

      await retry.try(async () => {
        const element = await testSubjects.find('updateSourceConfigurationButton');
        return !(await element.isEnabled());
      });
    },

    async closeFlyout() {
      const flyout = await testSubjects.find('sourceConfigurationFlyout');
      await testSubjects.click('closeFlyoutButton');
      await testSubjects.waitForDeleted(flyout);
    },
  };
}
