/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Note: this suite is currently only called from the feature flags test config:
// x-pack/test_serverless/functional/test_suites/search/config.feature_flags.ts
// These tests can be moved to the appropriate test file (spaces_selection,
// spaces_management) once multiple spaces are permanently enabled in production.

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlCommon = getPageObject('common');
  const svlCommonPage = getPageObject('svlCommonPage');
  const testSubjects = getService('testSubjects');

  describe('spaces', function () {
    describe('management', function () {
      describe('as Viewer', function () {
        before(async () => {
          await svlCommonPage.loginAsViewer();
        });

        it('does not display the space management card', async () => {
          await svlCommon.navigateToApp('management');
          await testSubjects.missingOrFail('app-card-spaces');
        });
      });

      describe('as Admin', function () {
        before(async () => {
          await svlCommonPage.loginAsAdmin();
        });

        it('displays the space management card', async () => {
          await svlCommon.navigateToApp('management');
          await testSubjects.existOrFail('app-card-spaces');
        });

        // xpack.spaces.allowFeatureVisibility: false for all solutions
        it(`does not display feature visibility`, async () => {
          await svlCommon.navigateToApp('management');
          await testSubjects.click('app-card-spaces');

          // create
          await testSubjects.click('createSpace');
          await testSubjects.missingOrFail('hideAllFeaturesLink');
          await testSubjects.click('cancel-space-button');

          // edit
          await testSubjects.click('default-hyperlink');
          await testSubjects.missingOrFail('hideAllFeaturesLink');
        });
      });
    });
  });
}
