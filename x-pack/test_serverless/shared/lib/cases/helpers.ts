/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export const navigateToCasesApp = async (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const testSubjects = getService('testSubjects');

  const common = getPageObject('common');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');

  await common.navigateToApp('landingPage');

  if (owner === SECURITY_SOLUTION_OWNER) {
    await testSubjects.click('solutionSideNavItemLink-cases');
  } else {
    await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
  }
};
