/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../types/providers';

import expect from '@kbn/expect';

export const LicenseManagementPageProvider = ({
  getPageObjects,
  getService,
}: KibanaFunctionalTestDefaultProviders) => {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const pageObjects = getPageObjects(['common']);

  return {
    async appHasLoaded() {
      const licenseText = await testSubjects.getVisibleText('licenseText');
      expect(licenseText).to.be('Your Trial license is active');

    },
  }

};
