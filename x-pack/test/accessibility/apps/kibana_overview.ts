/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'home']);
  const a11y = getService('a11y');

  // FLAKY: https://github.com/elastic/kibana/issues/82226
  describe.skip('Kibana overview', () => {
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.load('empty_kibana');
      await PageObjects.common.navigateToApp('kibanaOverview');
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.removeSampleDataSet('flights');
      await esArchiver.unload('empty_kibana');
    });

    it('Getting started view', async () => {
      await a11y.testAppSnapshot();
    });

    it('Overview view', async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.common.navigateToApp('kibanaOverview');
      await a11y.testAppSnapshot();
    });
  });
}
