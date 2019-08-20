/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('page navigation', function() {
    this.tags('smoke');
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    it('loads the home page', async () => {
      await ml.navigation.navigateToMl();
    });

    it('loads the job management page', async () => {
      await ml.navigation.navigateToJobManagement();
      await ml.jobManagement.assertJobStatsBarExists();
      await ml.jobManagement.assertJobTableExists();
      await ml.jobManagement.assertCreateNewJobButtonExists();
    });

    it('loads the anomaly explorer page', async () => {
      await ml.navigation.navigateToAnomalyExplorert();
      await ml.anomalyExplorer.assertAnomalyExplorerEmptyListMessageExists();
    });

    it('loads the single metric viewer page', async () => {
      await ml.navigation.navigateToSingleMetricViewer();
      await ml.singleMetricViewer.assertSingleMetricViewerEmptyListMessageExsist();
    });

    it('loads the data frame page', async () => {
      await ml.navigation.navigateToDataFrames();
      await ml.dataFrames.assertDataFrameEmptyListMessageExists();
    });

    it('loads the data visualizer page', async () => {
      await ml.navigation.navigateToDataVisualizer();
      await ml.dataVisualizer.assertDataVisualizerImportDataCardExists();
      await ml.dataVisualizer.assertDataVisualizerIndexDataCardExists();
    });

    it('loads the settings page', async () => {
      await ml.navigation.navigateToSettings();
      await ml.settings.assertSettingsCalendarLinkExists();
      await ml.settings.assertSettingsFilterlistLinkExists();
    });
  });
}
