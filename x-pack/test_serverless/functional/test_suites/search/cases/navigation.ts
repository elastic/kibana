/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlSearchLandingPage = getPageObject('svlSearchLandingPage');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const testSubjects = getService('testSubjects');

  describe('Cases navigation', function () {
    before(async () => {
      await svlSearchNavigation.navigateToLandingPage();
    });

    it('does not show cases in sidebar navigation', async () => {
      await svlSearchLandingPage.assertSvlSearchSideNavExists();

      expect(testSubjects.missingOrFail('cases'));
    });
  });
}
