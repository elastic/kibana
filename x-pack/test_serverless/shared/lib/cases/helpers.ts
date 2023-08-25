/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export const createOneCaseBeforeDeleteAllAfter = (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const cases = getService('cases');

  before(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  after(async () => {
    await cases.api.deleteAllCases();
  });
};

export const createOneCaseBeforeEachDeleteAllAfterEach = (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const cases = getService('cases');

  beforeEach(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  afterEach(async () => {
    await cases.api.deleteAllCases();
  });
};

export const createAndNavigateToCase = async (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const cases = getService('cases');
  const testSubjects = getService('testSubjects');

  const header = getPageObject('header');
  const common = getPageObject('common');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');

  // navigate to cases
  await common.navigateToApp('landingPage');

  if (owner === SECURITY_SOLUTION_OWNER) {
    await testSubjects.click('solutionSideNavItemLink-cases');
  } else {
    await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
  }

  const theCase = await cases.api.createCase({ owner });
  await cases.casesTable.waitForCasesToBeListed();
  await cases.casesTable.goToFirstListedCase();
  await header.waitUntilLoadingHasFinished();

  return theCase;
};
