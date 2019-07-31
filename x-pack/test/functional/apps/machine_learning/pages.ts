/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const mlAnomalyExplorer = getService('mlAnomalyExplorer');
  const mlDataFrames = getService('mlDataFrames');
  const mlDataVisualizer = getService('mlDataVisualizer');
  const mlJobManagement = getService('mlJobManagement');
  const mlNavigation = getService('mlNavigation');
  const mlSettings = getService('mlSettings');
  const mlSingleMetricViewer = getService('mlSingleMetricViewer');

  describe('page navigation', function() {
    this.tags('smoke');
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    it('loads the home page', async () => {
      await mlNavigation.navigateToMl();
    });

    it('loads the job management page', async () => {
      await mlNavigation.navigateToJobManagement();
      await mlJobManagement.assertJobStatsBarExists();
      await mlJobManagement.assertJobTableExists();
      await mlJobManagement.assertCreateNewJobButtonExists();
    });

    it('loads the anomaly explorer page', async () => {
      await mlNavigation.navigateToAnomalyExplorert();
      await mlAnomalyExplorer.assertAnomalyExplorerEmptyListMessageExists();
    });

    it('loads the single metric viewer page', async () => {
      await mlNavigation.navigateToSingleMetricViewer();
      await mlSingleMetricViewer.assertSingleMetricViewerEmptyListMessageExsist();
    });

    it('loads the data frame page', async () => {
      await mlNavigation.navigateToDataFrames();
      await mlDataFrames.assertDataFrameEmptyListMessageExists();
    });

    it('loads the data visualizer page', async () => {
      await mlNavigation.navigateToDataVisualizer();
      await mlDataVisualizer.assertDataVisualizerImportDataCardExists();
      await mlDataVisualizer.assertDataVisualizerIndexDataCardExists();
    });

    it('loads the settings page', async () => {
      await mlNavigation.navigateToSettings();
      await mlSettings.assertSettingsCalendarLinkExists();
      await mlSettings.assertSettingsFilterlistLinkExists();
    });
  });
}
