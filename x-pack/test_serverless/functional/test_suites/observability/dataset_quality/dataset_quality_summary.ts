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
  const PageObjects = getPageObjects([
    'common',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const to = '2024-01-01T12:00:00.000Z';
  const excludeKeysFromServerless = ['estimatedData']; // https://github.com/elastic/kibana/issues/178954

  describe('Dataset quality summary', () => {
    before(async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.svlCommonPage.loginWithRole('admin');
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
    });

    it('shows poor, degraded and good count', async () => {
      await PageObjects.datasetQuality.refreshTable();
      const summary = await PageObjects.datasetQuality.parseSummaryPanel(excludeKeysFromServerless);
      expect(summary).to.eql({
        datasetHealthPoor: '0',
        datasetHealthDegraded: '0',
        datasetHealthGood: '3',
        activeDatasets: '0 of 3',
      });
    });

    it('updates the poor count when degraded docs are ingested', async () => {
      // Index malformed document with current timestamp
      await synthtrace.index(
        getLogsForDataset({
          to: Date.now(),
          count: 1,
          dataset: datasetNames[2],
          isMalformed: true,
        })
      );

      await PageObjects.datasetQuality.refreshTable();

      const summary = await PageObjects.datasetQuality.parseSummaryPanel(excludeKeysFromServerless);
      expect(summary).to.eql({
        datasetHealthPoor: '1',
        datasetHealthDegraded: '0',
        datasetHealthGood: '2',
        activeDatasets: '1 of 3',
      });
    });

    it('updates the degraded count when degraded docs are ingested', async () => {
      // Index malformed document with current timestamp
      await synthtrace.index(
        getLogsForDataset({
          to: Date.now(),
          count: 1,
          dataset: datasetNames[1],
          isMalformed: true,
        })
      );

      // Index healthy documents
      await synthtrace.index(
        getLogsForDataset({
          to: Date.now(),
          count: 10,
          dataset: datasetNames[1],
          isMalformed: false,
        })
      );

      await PageObjects.datasetQuality.refreshTable();

      const summary = await PageObjects.datasetQuality.parseSummaryPanel(excludeKeysFromServerless);
      expect(summary).to.eql({
        datasetHealthPoor: '1',
        datasetHealthDegraded: '1',
        datasetHealthGood: '1',
        activeDatasets: '2 of 3',
      });
    });

    it('updates active datasets', async () => {
      // Index document at current time to mark dataset as active
      await synthtrace.index(
        getLogsForDataset({
          to: Date.now(),
          count: 4,
          dataset: datasetNames[0],
          isMalformed: false,
        })
      );

      await PageObjects.datasetQuality.refreshTable();

      const { activeDatasets: updatedActiveDatasets } =
        await PageObjects.datasetQuality.parseSummaryPanel(excludeKeysFromServerless);

      expect(updatedActiveDatasets).to.eql('3 of 3');
    });
  });
}
