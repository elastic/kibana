/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common';
import { AppDeepLinkId } from '@kbn/core-chrome-browser';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export const createOneCaseBeforeDeleteAllAfter = (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const svlCases = getService('svlCases');

  before(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  after(async () => {
    await svlCases.api.deleteAllCaseItems();
  });
};

export const createOneCaseBeforeEachDeleteAllAfterEach = (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const svlCases = getService('svlCases');

  beforeEach(async () => {
    await createAndNavigateToCase(getPageObject, getService, owner);
  });

  afterEach(async () => {
    await svlCases.api.deleteAllCaseItems();
  });
};

export const createAndNavigateToCase = async (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const cases = getService('cases');

  const header = getPageObject('header');

  await navigateToCasesApp(getPageObject, getService, owner);

  const theCase = await cases.api.createCase({ owner });
  await cases.casesTable.waitForCasesToBeListed();
  await cases.casesTable.goToFirstListedCase();
  await header.waitUntilLoadingHasFinished();

  return theCase;
};

export const navigateToCasesApp = async (
  getPageObject: FtrProviderContext['getPageObject'],
  getService: FtrProviderContext['getService'],
  owner: string
) => {
  const common = getPageObject('common');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');

  await common.navigateToApp('landingPage');

  if (owner === SECURITY_SOLUTION_OWNER) {
    await svlCommonNavigation.sidenav.clickLink({
      deepLinkId: 'securitySolutionUI:cases' as AppDeepLinkId,
    });
  } else {
    await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });
  }
};
