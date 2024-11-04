/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { createScenarios as createAPIScenarios } from '../../reporting_api_integration/services/scenarios';
import { FtrProviderContext } from '../ftr_provider_context';

const GENERATE_CSV_DATA_TEST_SUBJ = 'embeddablePanelAction-generateCsvReport';

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
    await PageObjects.canvas.goToListingPage();
    await PageObjects.canvas.loadFirstWorkpad(title);
  };

  const tryDashboardGenerateCsvFail = async (savedSearchTitle: string) => {
    await dashboardPanelActions.clickPanelActionByTitle(
      GENERATE_CSV_DATA_TEST_SUBJ,
      savedSearchTitle
    );
    await testSubjects.existOrFail('generateCsvFail');
  };
  const tryDashboardGenerateCsvNotAvailable = async (savedSearchTitle: string) => {
    await dashboardPanelActions.expectMissingPanelAction(
      GENERATE_CSV_DATA_TEST_SUBJ,
      savedSearchTitle
    );
  };
  const tryDashboardGenerateCsvSuccess = async (savedSearchTitle: string) => {
    await dashboardPanelActions.expectExistsPanelAction(
      GENERATE_CSV_DATA_TEST_SUBJ,
      savedSearchTitle
    );
    await dashboardPanelActions.clickPanelActionByTitle(
      GENERATE_CSV_DATA_TEST_SUBJ,
      savedSearchTitle
    );
    await testSubjects.existOrFail('csvReportStarted'); /* validate toast panel */
  };
  const tryDiscoverCsvFail = async () => {
    await PageObjects.reporting.openExportTab();
    await PageObjects.reporting.clickGenerateReportButton();
    const queueReportError = await PageObjects.reporting.getQueueReportError();
    expect(queueReportError).to.be(true);
  };
  const tryDiscoverCsvNotAvailable = async () => {
    await PageObjects.share.clickShareTopNavButton();
    await testSubjects.missingOrFail('Export');
  };
  const tryDiscoverCsvSuccess = async () => {
    await PageObjects.reporting.openExportTab();
    expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
  };
  const tryGeneratePdfFail = async () => {
    await PageObjects.reporting.openExportTab();
    await PageObjects.reporting.clickGenerateReportButton();
    const queueReportError = await PageObjects.reporting.getQueueReportError();
    expect(queueReportError).to.be(true);
  };
  const tryGeneratePdfNotAvailable = async () => {
    await PageObjects.share.clickShareTopNavButton();
    await testSubjects.missingOrFail(`Export`);
  };
  const tryGeneratePdfSuccess = async () => {
    await PageObjects.reporting.openExportTab();
    expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
  };
  const tryGeneratePngSuccess = async () => {
    await PageObjects.reporting.openExportTab();
    await testSubjects.click('pngV2-radioOption');
    expect(await PageObjects.reporting.canReportBeCreated()).to.be(true);
  };
  const tryReportsNotAvailable = async () => {
    await PageObjects.share.clickShareTopNavButton();
    await testSubjects.missingOrFail('Export');
  };

  return {
    ...scenariosAPI,
    openSavedVisualization,
    openSavedDashboard,
    openSavedSearch,
    openCanvasWorkpad,
    tryDashboardGenerateCsvFail,
    tryDashboardGenerateCsvNotAvailable,
    tryDashboardGenerateCsvSuccess,
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
  };
}
