/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { datasetNames, getInitialTestLogs, getLogsForDataset } from './data';

const integrationActions = {
  overview: 'Overview',
  template: 'Template',
  viewDashboards: 'ViewDashboards',
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('svlLogsSynthtraceClient');
  const retry = getService('retry');
  const browser = getService('browser');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality flyout', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('admin');
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    it('opens the flyout for the right dataset', async () => {
      const testDatasetName = datasetNames[1];

      await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

      await testSubjects.existOrFail(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutTitle
      );
    });

    // Fails on Serverless. TODO: Need to update the UI as well as the test
    it.skip('shows the correct last activity', async () => {
      const testDatasetName = datasetNames[0];

      // Update last activity for the dataset
      await PageObjects.datasetQuality.closeFlyout();
      await synthtrace.index(
        getLogsForDataset({ to: new Date().toISOString(), count: 1, dataset: testDatasetName })
      );
      await PageObjects.datasetQuality.refreshTable();

      const cols = await PageObjects.datasetQuality.parseDatasetTable();

      const datasetNameCol = cols['Dataset Name'];
      const datasetNameColCellTexts = await datasetNameCol.getCellTexts();

      const testDatasetRowIndex = datasetNameColCellTexts.findIndex(
        (dName: string) => dName === testDatasetName
      );

      const lastActivityText = (await cols['Last Activity'].getCellTexts())[testDatasetRowIndex];

      await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

      const lastActivityTextExists = await PageObjects.datasetQuality.doestTextExistInFlyout(
        lastActivityText,
        `[data-test-subj=${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutFieldValue}]`
      );
      expect(lastActivityTextExists).to.eql(true);
    });

    it('shows the integration details', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';
      const apacheIntegrationId = 'apache';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );

      await PageObjects.datasetQuality.navigateTo();

      await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

      const integrationNameElements = await PageObjects.datasetQuality.getFlyoutElementsByText(
        '[data-test-subj=datasetQualityFlyoutFieldValue]',
        apacheIntegrationId
      );

      expect(integrationNameElements.length).to.eql(1);
    });

    it('goes to log explorer page when open button is clicked', async () => {
      const testDatasetName = datasetNames[2];
      await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

      await (await PageObjects.datasetQuality.getFlyoutLogsExplorerButton()).click();

      // Confirm dataset selector text in observability logs explorer
      const datasetSelectorText =
        await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
      expect(datasetSelectorText).to.eql(testDatasetName);
    });

    it('Integration actions menu is present with correct actions', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );

      await PageObjects.datasetQuality.navigateTo();

      await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);
      await PageObjects.datasetQuality.openIntegrationActionsMenu();

      const actions = await Promise.all(
        Object.values(integrationActions).map((action) =>
          PageObjects.datasetQuality.getIntegrationActionButtonByAction(action)
        )
      );

      expect(actions.length).to.eql(3);
    });

    it('Integration dashboard action hidden for integrations without dashboards', async () => {
      const bitbucketDatasetName = 'atlassian_bitbucket.audit';
      const bitbucketDatasetHumanName = 'Bitbucket Audit Logs';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.installPackage({
        name: 'atlassian_bitbucket',
        version: '1.14.0',
      });

      // Index 10 logs for `atlassian_bitbucket.audit` dataset
      await synthtrace.index(getLogsForDataset({ to, count: 10, dataset: bitbucketDatasetName }));

      await PageObjects.datasetQuality.navigateTo();

      await PageObjects.datasetQuality.openDatasetFlyout(bitbucketDatasetHumanName);
      await PageObjects.datasetQuality.openIntegrationActionsMenu();

      await testSubjects.missingOrFail(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutIntegrationAction(
          integrationActions.viewDashboards
        )
      );
    });

    it('Integration overview action should navigate to the integration overview page', async () => {
      const bitbucketDatasetName = 'atlassian_bitbucket.audit';
      const bitbucketDatasetHumanName = 'Bitbucket Audit Logs';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.installPackage({
        name: 'atlassian_bitbucket',
        version: '1.14.0',
      });

      // Index 10 logs for `atlassian_bitbucket.audit` dataset
      await synthtrace.index(getLogsForDataset({ to, count: 10, dataset: bitbucketDatasetName }));

      await PageObjects.datasetQuality.navigateTo();

      await PageObjects.datasetQuality.openDatasetFlyout(bitbucketDatasetHumanName);
      await PageObjects.datasetQuality.openIntegrationActionsMenu();

      const action = await PageObjects.datasetQuality.getIntegrationActionButtonByAction(
        integrationActions.overview
      );

      await action.click();

      await retry.tryForTime(5000, async () => {
        const currentUrl = await browser.getCurrentUrl();
        const parsedUrl = new URL(currentUrl);

        expect(parsedUrl.pathname).to.contain('/app/integrations/detail/atlassian_bitbucket');
      });
    });

    it('Integration template action should navigate to the index template page', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );

      await PageObjects.datasetQuality.navigateTo();

      await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);
      await PageObjects.datasetQuality.openIntegrationActionsMenu();

      const action = await PageObjects.datasetQuality.getIntegrationActionButtonByAction(
        integrationActions.template
      );

      await action.click();

      await retry.tryForTime(5000, async () => {
        const currentUrl = await browser.getCurrentUrl();
        const parsedUrl = new URL(currentUrl);
        expect(parsedUrl.pathname).to.contain(
          `/app/management/data/index_management/templates/logs-${apacheAccessDatasetName}`
        );
      });
    });

    it('Integration dashboard action should navigate to the selected dashboard', async () => {
      const apacheAccessDatasetName = 'apache.access';
      const apacheAccessDatasetHumanName = 'Apache access logs';

      await PageObjects.observabilityLogsExplorer.navigateTo();

      // Add initial integrations
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();

      // Index 10 logs for `logs-apache.access` dataset
      await synthtrace.index(
        getLogsForDataset({ to, count: 10, dataset: apacheAccessDatasetName })
      );

      await PageObjects.datasetQuality.navigateTo();

      await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);
      await PageObjects.datasetQuality.openIntegrationActionsMenu();

      const action = await PageObjects.datasetQuality.getIntegrationActionButtonByAction(
        integrationActions.viewDashboards
      );

      await action.click();

      const dashboardButtons = await PageObjects.datasetQuality.getIntegrationDashboardButtons();
      const firstDashboardButton = await dashboardButtons[0];
      const dashboardText = await firstDashboardButton.getVisibleText();

      await firstDashboardButton.click();

      const breadcrumbText = await testSubjects.getVisibleText('breadcrumb last');

      expect(breadcrumbText).to.eql(dashboardText);
    });
  });
}
