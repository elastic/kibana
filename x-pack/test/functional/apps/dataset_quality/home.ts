/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityFtrProviderContext } from './config';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);

  const testSubjects = getService('testSubjects');

  describe('Dataset quality home', () => {
    it('dataset quality table exists', async () => {
      await PageObjects.datasetQuality.navigateTo();
      await testSubjects.existOrFail(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityTable
      );
    });
  });
}
