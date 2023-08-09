/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../functional/page_objects/svl_common_navigation';

export default ({ getService, getPageObject }: FtrProviderContext) => {
  // const svlCommonApi = getService('svlCommonApi');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const testSubjects = getService('testSubjects');

  /**
   * Load sample data from the visualize library
   */
  // http://localhost:5601/cue/app/home#/tutorial_directory/sampleData
  // <span class="euiSideNavItemButton__label euiSideNavItemButton__label--truncated" title="Management">Management</span>
  // data-test-subj="showSampleDataButton"
  // data-test-subj="addSampleDataSetecommerce"
  // wait for toast Sample eCommerce orders installed

  const reportingFunctional = getService('reportingFunctional');

  describe('Access to Management > Reporting', () => {
    // before(async () => {
    //   await reportingFunctional.initEcommerce();
    // svlCommonNavigation.sideNav.clickLink('Management')

    // });
    // after(async () => {
    //   await reportingFunctional.teardownEcommerce();
    // });
    // this.tags(['skipSvlObt', 'skipSvlSec'], () => {})

    it('does not allow user that does not have reporting privileges', async () => {
      await reportingFunctional.loginDataAnalyst();
      await svlCommonNavigation.navigateToApp('reporting');
      await testSubjects.missingOrFail('reportJobListing');
    });

    it('does allow user with reporting privileges', async () => {
      await reportingFunctional.loginReportingUser();
      await svlCommonNavigation.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing');
    });
  });
};
