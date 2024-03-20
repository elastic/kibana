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
  const browser = getService('browser');
  const retry = getService('retry');
  const to = '2024-01-01T12:00:00.000Z';

  // Failing: See https://github.com/elastic/kibana/issues/178874
  // Failing: See https://github.com/elastic/kibana/issues/178884
  describe.skip('Dataset quality summary', () => {
    before(async () => {
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.svlCommonPage.loginWithRole('admin');
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
    });

    it('shows poor, degraded and good count', async () => {
      const summary = await PageObjects.datasetQuality.parseSummaryPanel();
      expect(summary).to.eql({
        datasetHealthPoor: '0',
        datasetHealthDegraded: '0',
        datasetHealthGood: '3',
        activeDatasets: '0 of 3',
        estimatedData: '0 Bytes',
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

      await browser.refresh();
      await PageObjects.datasetQuality.waitUntilSummaryPanelLoaded();

      await retry.try(async () => {
        const summary = await PageObjects.datasetQuality.parseSummaryPanel();
        const { estimatedData, ...restOfSummary } = summary;
        expect(restOfSummary).to.eql({
          datasetHealthPoor: '1',
          datasetHealthDegraded: '0',
          datasetHealthGood: '2',
          activeDatasets: '1 of 3',
        });
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

      await browser.refresh();
      await PageObjects.datasetQuality.waitUntilSummaryPanelLoaded();

      await retry.try(async () => {
        const { estimatedData, ...restOfSummary } =
          await PageObjects.datasetQuality.parseSummaryPanel();
        expect(restOfSummary).to.eql({
          datasetHealthPoor: '1',
          datasetHealthDegraded: '1',
          datasetHealthGood: '1',
          activeDatasets: '2 of 3',
        });
      });
    });

    it('updates active datasets and estimated data KPIs', async () => {
      const { estimatedData: _existingEstimatedData } =
        await PageObjects.datasetQuality.parseSummaryPanel();

      // Index document at current time to mark dataset as active
      await synthtrace.index(
        getLogsForDataset({
          to: Date.now(),
          count: 4,
          dataset: datasetNames[0],
          isMalformed: false,
        })
      );

      await browser.refresh(); // Summary panel doesn't update reactively
      await PageObjects.datasetQuality.waitUntilSummaryPanelLoaded();

      await retry.try(async () => {
        const { activeDatasets: updatedActiveDatasets, estimatedData: _updatedEstimatedData } =
          await PageObjects.datasetQuality.parseSummaryPanel();

        expect(updatedActiveDatasets).to.eql('3 of 3');

        // TODO: Investigate. This fails on Serverless.
        // expect(_updatedEstimatedData).to.not.eql(_existingEstimatedData);
      });
    });
  });
}
