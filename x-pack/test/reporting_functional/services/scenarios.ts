/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { checkIfPngsMatch } from '../../../../test/functional/services/lib/compare_pngs';
import { createScenarios as createAPIScenarios } from '../../reporting_api_integration/services/scenarios';
import { FtrProviderContext } from '../ftr_provider_context';

export function createScenarios(
  context: Pick<FtrProviderContext, 'getPageObjects' | 'getService'>
) {
  const { getService, getPageObjects } = context;
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const PageObjects = getPageObjects([
    'reporting',
    'security',
    'common',
    'share',
    'visualize',
    'dashboard',
    'discover',
    'canvas',
  ]);
  const scenariosAPI = createAPIScenarios(context);

  const {
    DATA_ANALYST_USERNAME,
    DATA_ANALYST_PASSWORD,
    REPORTING_USER_USERNAME,
    REPORTING_USER_PASSWORD,
  } = scenariosAPI;

  const loginDataAnalyst = async () => {
    await PageObjects.security.forceLogout();
    await PageObjects.security.login(DATA_ANALYST_USERNAME, DATA_ANALYST_PASSWORD, {
      expectSpaceSelector: false,
    });
  };

  const loginReportingUser = async () => {
    await PageObjects.security.forceLogout();
    await PageObjects.security.login(REPORTING_USER_USERNAME, REPORTING_USER_PASSWORD, {
      expectSpaceSelector: false,
    });
  };

  const openSavedVisualization = async (title: string) => {
    log.debug(`Opening saved visualizatiton: ${title}`);
    await PageObjects.common.navigateToApp('visualize');
    await PageObjects.visualize.openSavedVisualization(title);
  };

  const openSavedDashboard = async (title: string) => {
    log.debug(`Opening saved dashboard: ${title}`);
    await PageObjects.common.navigateToApp('dashboard');
    await PageObjects.dashboard.loadSavedDashboard(title);
  };

  const openSavedSearch = async (title: string) => {
    log.debug(`Opening saved search: ${title}`);
    await PageObjects.common.navigateToApp('discover');
    await PageObjects.discover.loadSavedSearch(title);
  };

  const openCanvasWorkpad = async (title: string) => {
    log.debug(`Opening saved canvas workpad: ${title}`);
    await PageObjects.common.navigateToApp('canvas');
    await PageObjects.canvas.loadFirstWorkpad(title);
  };

  const getSavedSearchPanel = async (savedSearchTitle: string) => {
    return await testSubjects.find(`embeddablePanelHeading-${savedSearchTitle.replace(' ', '')}`);
  };
  const tryDashboardDownloadCsvFail = async (savedSearchTitle: string) => {
    const savedSearchPanel = await getSavedSearchPanel(savedSearchTitle);
    await dashboardPanelActions.toggleContextMenu(savedSearchPanel);
    await dashboardPanelActions.clickContextMenuMoreItem();
    const actionItemTestSubj = 'embeddablePanelAction-downloadCsvReport';
    await testSubjects.existOrFail(actionItemTestSubj);
    /* wait for the full panel to display or else the test runner could click the wrong option! */ await testSubjects.click(
      actionItemTestSubj
    );
    await testSubjects.existOrFail('downloadCsvFail');
  };
  const tryDashboardDownloadCsvNotAvailable = async (savedSearchTitle: string) => {
    const savedSearchPanel = await getSavedSearchPanel(savedSearchTitle);
    await dashboardPanelActions.toggleContextMenu(savedSearchPanel);
    await dashboardPanelActions.clickContextMenuMoreItem();
    await testSubjects.missingOrFail('embeddablePanelAction-downloadCsvReport');
  };
  const tryDashboardDownloadCsvSuccess = async (savedSearchTitle: string) => {
    const savedSearchPanel = await getSavedSearchPanel(savedSearchTitle);
    await dashboardPanelActions.toggleContextMenu(savedSearchPanel);
    await dashboardPanelActions.clickContextMenuMoreItem();
    const actionItemTestSubj = 'embeddablePanelAction-downloadCsvReport';
    await testSubjects.existOrFail(actionItemTestSubj);
    /* wait for the full panel to display or else the test runner could click the wrong option! */ await testSubjects.click(
      actionItemTestSubj
    );
    await testSubjects.existOrFail('csvDownloadStarted'); /* validate toast panel */
  };
  const tryDiscoverCsvFail = async () => {
    await PageObjects.reporting.openCsvReportingPanel();
    await PageObjects.reporting.clickGenerateReportButton();
    const queueReportError = await PageObjects.reporting.getQueueReportError();
    expect(queueReportError).to.be(true);
  };
  const tryDiscoverCsvNotAvailable = async () => {
    await PageObjects.share.clickShareTopNavButton();
    await testSubjects.missingOrFail('sharePanel-CSVReports');
  };
  const tryDiscoverCsvSuccess = async () => {
    await PageObjects.reporting.openCsvReportingPanel();
    expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
  };
  const tryGeneratePdfFail = async () => {
    await PageObjects.reporting.openPdfReportingPanel();
    await PageObjects.reporting.clickGenerateReportButton();
    const queueReportError = await PageObjects.reporting.getQueueReportError();
    expect(queueReportError).to.be(true);
  };
  const tryGeneratePdfNotAvailable = async () => {
    PageObjects.share.clickShareTopNavButton();
    await testSubjects.missingOrFail(`sharePanel-PDFReports`);
  };
  const tryGeneratePdfSuccess = async () => {
    await PageObjects.reporting.openPdfReportingPanel();
    expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
  };
  const tryGeneratePngSuccess = async () => {
    await PageObjects.reporting.openPngReportingPanel();
    expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
  };
  const tryReportsNotAvailable = async () => {
    await PageObjects.share.clickShareTopNavButton();
    await testSubjects.missingOrFail('sharePanel-Reports');
  };

  return {
    ...scenariosAPI,
    openSavedVisualization,
    openSavedDashboard,
    openSavedSearch,
    openCanvasWorkpad,
    tryDashboardDownloadCsvFail,
    tryDashboardDownloadCsvNotAvailable,
    tryDashboardDownloadCsvSuccess,
    tryDiscoverCsvFail,
    tryDiscoverCsvNotAvailable,
    tryDiscoverCsvSuccess,
    tryGeneratePdfFail,
    tryGeneratePdfNotAvailable,
    tryGeneratePdfSuccess,
    tryGeneratePngSuccess,
    tryReportsNotAvailable,
    loginDataAnalyst,
    loginReportingUser,
    checkIfPngsMatch,
  };
}
