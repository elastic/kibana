/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const log = getService('log');
  const testSubjects = getService('testSubjects');

  describe('Close Solution Tour', function () {
    // This is a test used to close the global solution tour when we
    // use elasticsearch as the default solution. Solution tour is saved in a
    // global setting index so we need to utilize the space tour close button
    // or manually update the index.
    it('should close the solution tour if its visible', async () => {
      await PageObjects.common.navigateToApp('spaceSelector');
      if (await testSubjects.exists('spaceSolutionTour')) {
        log.info('Found the solution tour open, closing it');
        await testSubjects.click('closeTourBtn'); // close the tour
        await PageObjects.common.sleep(1000); // wait to save the setting
      }
    });
  });
}
