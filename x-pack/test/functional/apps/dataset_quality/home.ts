/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityFtrProviderContext } from './config';
import { getInitialTestLogs } from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);

  const testSubjects = getService('testSubjects');
  const synthtrace = getService('logSynthtraceEsClient');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality home', () => {
    describe('with no datasets available', () => {
      before(async () => {
        await PageObjects.datasetQuality.navigateTo();
      });

      it('shows the empty state', async () => {
        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityNoDataEmptyState
        );
      });
    });

    describe('with datasets available', () => {
      before(async () => {
        await synthtrace.index(getInitialTestLogs({ to, count: 1 }));
        await PageObjects.datasetQuality.navigateTo();
      });

      after(async () => {
        await synthtrace.clean();
      });

      it('dataset quality table exists', async () => {
        await PageObjects.datasetQuality.navigateTo();
        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityTable
        );
      });
    });
  });
}
