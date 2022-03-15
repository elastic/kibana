/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['licenseManagement', 'common']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');

  describe('License Management page a11y tests', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('licenseManagement');
    });

    it('License management page overview meets a11y requirements', async () => {
      await a11y.testAppSnapshot();
    });

    it('Update license panel meets a11y requirements', async () => {
      await testSubjects.click('updateLicenseButton');
      await a11y.testAppSnapshot();
    });

    it('Upload license error panel meets a11y requirements', async () => {
      await testSubjects.click('uploadLicenseButton');
      await a11y.testAppSnapshot();
    });

    it('Revert to basic license confirmation panel meets a11y requirements', async () => {
      await testSubjects.click('cancelUploadButton');
      await testSubjects.click('revertToBasicButton');
      await a11y.testAppSnapshot();
      await testSubjects.click('confirmModalCancelButton');
    });
  });
}
