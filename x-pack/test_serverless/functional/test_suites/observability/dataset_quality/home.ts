/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'datasetQuality',
    'observabilityLogsExplorer',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);

  const testSubjects = getService('testSubjects');

  describe('Dataset quality home', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('admin');
    });

    it('dataset quality table exists', async () => {
      await PageObjects.datasetQuality.navigateTo();
      await testSubjects.existOrFail(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityTable
      );
    });
  });
}
