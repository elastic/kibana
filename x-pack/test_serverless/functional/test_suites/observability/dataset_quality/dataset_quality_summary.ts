/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { datasetNames, getInitialTestLogs, getLogsForDataset } from './data';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const to = '2024-01-01T12:00:00.000Z';
  const excludeKeysFromServerless = ['estimatedData']; // https://github.com/elastic/kibana/issues/178954

  const ingestDataForSummary = async () => {
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

  describe('Dataset quality summary', () => {
    before(async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.svlCommonPage.loginAsViewer();
      await PageObjects.datasetQuality.navigateTo();
    });

    afterEach(async () => {
      await synthtrace.clean();
    });

    it('shows poor, degraded and good count as 0 and all dataset as healthy', async () => {
      await PageObjects.datasetQuality.refreshTable();
      // Sometimes the summary flashes with wrong count, retry to stabilize. This should be fixed at the root, but for now we retry.
      await retry.try(async () => {
        const summary = await PageObjects.datasetQuality.parseSummaryPanel(
          excludeKeysFromServerless
        );
        expect(summary).to.eql({
          datasetHealthPoor: '0',
          datasetHealthDegraded: '0',
          datasetHealthGood: '3',
          activeDatasets: '0 of 3',
        });
      });
    });

    it('shows updated count for poor, degraded and good datasets and updates active datasets', async () => {
      await ingestDataForSummary();
      await PageObjects.datasetQuality.refreshTable();

      const summary = await PageObjects.datasetQuality.parseSummaryPanel(excludeKeysFromServerless);
      expect(summary).to.eql({
        datasetHealthPoor: '1',
        datasetHealthDegraded: '1',
        datasetHealthGood: '1',
        activeDatasets: '2 of 3',
      });
    });
  });
}
