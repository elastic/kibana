/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlCommonNavigation = getService('svlCommonNavigation');
  const testSubjects = getService('testSubjects');

  describe('spaces', function () {
    describe('selection', function () {
      describe('as Viewer', function () {
        before(async () => {
          await svlCommonPage.loginAsViewer();
        });

        it('displays the space selection menu in header', async () => {
          await svlCommonNavigation.navigateToKibanaHome();
          await svlCommonPage.assertProjectHeaderExists();

          await testSubjects.existOrFail('spacesNavSelector');
        });

        it(`does not display the manage button in the space selection menu`, async () => {
          await svlCommonNavigation.navigateToKibanaHome();
          await svlCommonPage.assertProjectHeaderExists();
          await testSubjects.click('spacesNavSelector');
          await testSubjects.missingOrFail('manageSpaces');
        });
      });

      describe('as Admin', function () {
        before(async () => {
          await svlCommonPage.loginAsAdmin();
        });

        it('displays the space selection menu in header', async () => {
          await svlCommonNavigation.navigateToKibanaHome();
          await svlCommonPage.assertProjectHeaderExists();
          await testSubjects.existOrFail('spacesNavSelector');
        });

        it(`displays the manage button in the space selection menu`, async () => {
          await svlCommonNavigation.navigateToKibanaHome();
          await svlCommonPage.assertProjectHeaderExists();
          await testSubjects.click('spacesNavSelector');
          await testSubjects.existOrFail('manageSpaces');
        });
      });
    });
  });
}
