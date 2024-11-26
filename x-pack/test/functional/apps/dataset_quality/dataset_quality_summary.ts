/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityFtrProviderContext } from './config';
import { datasetNames, getInitialTestLogs, getLogsForDataset } from './data';

export default function ({ getService, getPageObjects }: DatasetQualityFtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
  ]);
  const synthtrace = getService('logSynthtraceEsClient');
  const to = '2024-01-01T12:00:00.000Z';

  const ingestDataForSummary = () => {
    // Ingest documents for 3 type of datasets
    return synthtrace.index([
      // Ingest good data to all 3 datasets
      getInitialTestLogs({ to, count: 4 }),
      // Ingesting poor data to one dataset
      getLogsForDataset({
        to: Date.now(),
        count: 1,
        dataset: datasetNames[1],
        isMalformed: true,
      }),
      // Ingesting degraded docs into another dataset by ingesting malformed 1st and then good data
      getLogsForDataset({
        to: Date.now(),
        count: 1,
        dataset: datasetNames[2],
        isMalformed: true,
      }),
      getLogsForDataset({
        to: Date.now(),
        count: 10,
        dataset: datasetNames[2],
        isMalformed: false,
      }),
    ]);
  };

  describe.only('Dataset quality summary', () => {
    afterEach(async () => {
      await synthtrace.clean();
    });

    it('shows poor, degraded and good count as 0 and all dataset as healthy', async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.datasetQuality.navigateTo();

      const summary = await PageObjects.datasetQuality.parseSummaryPanel();
      expect(summary).to.eql({
        datasetHealthPoor: '0',
        datasetHealthDegraded: '0',
        datasetHealthGood: '3',
        activeDatasets: '0 of 3',
        estimatedData: '0.0 B',
      });
    });

    it('shows updated count for poor, degraded and good datasets, estimated size and updates active datasets', async () => {
      await ingestDataForSummary();
      await PageObjects.datasetQuality.navigateTo();

      const summary = await PageObjects.datasetQuality.parseSummaryPanel();
      const { estimatedData, ...restOfSummary } = summary;
      expect(restOfSummary).to.eql({
        datasetHealthPoor: '1',
        datasetHealthDegraded: '1',
        datasetHealthGood: '1',
        activeDatasets: '2 of 3',
      });

      const sizeInNumber = parseFloat(estimatedData.split(' ')[0]);
      expect(sizeInNumber).to.be.greaterThan(0);
    });
  });
}
