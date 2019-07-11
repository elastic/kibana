/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getService }: KibanaFunctionalTestDefaultProviders) {
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
      await ml.navigateTo();
    });

    it('loads the job management page', async () => {
      await ml.navigateToJobManagement();
      await ml.assertJobStatsBarExists();
      await ml.assertJobTableExists();
      await ml.assertCreateNewJobButtonExists();
    });

    it('loads the anomaly explorer page', async () => {
      await ml.navigateToAnomalyExplorert();
      await ml.assertAnomalyExplorerEmptyListMessageExists();
    });

    it('loads the single metric viewer page', async () => {
      await ml.navigateToSingleMetricViewer();
      await ml.assertSingleMetricViewerEmptyListMessageExsist();
    });

    it('loads the data frame page', async () => {
      await ml.navigateToDataFrames();
      await ml.assertDataFrameEmptyListMessageExists();
    });

    it('loads the data visualizer page', async () => {
      await ml.navigateToDataVisualizer();
      await ml.assertDataVisualizerImportDataCardExists();
      await ml.assertDataVisualizerIndexDataCardExists();
    });

    it('loads the settings page', async () => {
      await ml.navigateToSettings();
      await ml.assertSettingsCalendarLinkExists();
      await ml.assertSettingsFilterlistLinkExists();
    });
  });
}
