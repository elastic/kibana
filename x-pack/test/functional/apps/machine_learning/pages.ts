/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['machineLearning']);

  // eslint-disable-next-line ban/ban
  describe.only('page navigation', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
    });

    it('loads the home page', async () => {
      await PageObjects.machineLearning.navigateTo();
    });

    it('loads the job management page', async () => {
      await PageObjects.machineLearning.navigateToJobManagement();
      await PageObjects.machineLearning.gettJobStatsBar();
      await PageObjects.machineLearning.getJobTable();
      await PageObjects.machineLearning.gettCreateNewJobButton();
    });

    it('loads the anomaly explorer page', async () => {
      await PageObjects.machineLearning.navigateToAnomalyExplorert();
      await PageObjects.machineLearning.getAnomalyExplorerEmptyListMessage();
    });

    it('loads the single metric viewer page', async () => {
      await PageObjects.machineLearning.navigateToSingleMetricViewer();
      await PageObjects.machineLearning.getSingleMetricViewerEmptyListMessage();
    });

    it('loads the data frame page', async () => {
      await PageObjects.machineLearning.navigateToDataFrames();
      await PageObjects.machineLearning.getDataFrameEmptyListMessage();
    });

    it('loads the data visualizer page', async () => {
      await PageObjects.machineLearning.navigateToDataVisualizer();
      await PageObjects.machineLearning.getDataVisualizerImportDataCard();
      await PageObjects.machineLearning.getDataVisualizerIndexDataCard();
    });

    it('loads the settings page', async () => {
      await PageObjects.machineLearning.navigateToSettings();
      await PageObjects.machineLearning.gettSettingsCalendarLink();
      await PageObjects.machineLearning.gettSettingsFilterlistLink();
    });
  });
}
