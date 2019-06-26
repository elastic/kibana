/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'licenseManagement']);

  describe('Home page', function () {
    // this.tags('smoke');
    before(async () => {
      await pageObjects.common.navigateToApp('licenseManagement')
    });

    it('Loads the app', async () => {
      await pageObjects.licenseManagement.appHasLoaded();
    });
  });
};
