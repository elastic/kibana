/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const header = getPageObject('header');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');

  describe('cases list', function () {
    this.tags('skipFIPS');

    before(async () => {
      await cases.api.deleteAllCases();
      await cases.navigation.navigateToApp();
    });

    after(async () => {
      await cases.api.deleteAllCases();
      await cases.casesTable.waitForCasesToBeDeleted();
    });

    it('displays an empty list with an add button correctly', async () => {
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('case-callouts');
      await testSubjects.existOrFail('case-callout-license-info');
    });
  });
};
