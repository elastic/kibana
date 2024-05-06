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

  describe('space selection', function () {
    before(async () => {
      await svlCommonPage.loginWithRole('viewer');
    });

    it('does not have the space selection menu in header', async () => {
      await svlCommonNavigation.navigateToKibanaHome();
      await svlCommonPage.assertProjectHeaderExists();

      await testSubjects.missingOrFail('spacesNavSelector');
    });
  });
}
