/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

export const LicenseManagementPageProvider = ({
  getService,
}: KibanaFunctionalTestDefaultProviders) => {
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  return {
    async appHasLoaded() {
      await log.debug('Checking for license header.');
      const licenseText = await testSubjects.getVisibleText('licenseText');
      expect(licenseText).to.be('Your Trial license is active');
    },
  };
};
