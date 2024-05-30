/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  datasetNames,
  getInitialTestLogs,
  getLogsForDataset,
  createDegradedFieldsRecord,
} from './data';

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
  const excludeKeysFromServerless = ['size']; // https://github.com/elastic/kibana/issues/178954

  describe('Dataset quality flyout', function () {
    // FLAKY: https://github.com/elastic/kibana/issues/183771
    // Added this sub describe block so that the existing flaky tests can be skipped and new ones can be added in the other describe block

    describe.skip('Other dataset quality flyout tests', () => {
      this.tags(['failsOnMKI']); // Failing https://github.com/elastic/kibana/issues/183495

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

      // FLAKY: https://github.com/elastic/kibana/issues/180994
      it.skip('reflects the breakdown field state in url', async () => {
        const testDatasetName = datasetNames[0];
        await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

        const breakdownField = 'service.name';
        await PageObjects.datasetQuality.selectBreakdownField(breakdownField);

        // Wait for URL to contain "breakdownField:service.name"
        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          expect(decodeURIComponent(currentUrl)).to.contain(`breakdownField:${breakdownField}`);
        });

        // Clear breakdown field
        await PageObjects.datasetQuality.selectBreakdownField('No breakdown');

        // Wait for URL to not contain "breakdownField"
        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          expect(currentUrl).to.not.contain('breakdownField');
        });
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

        await PageObjects.datasetQuality.closeFlyout();

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

      it('shows summary KPIs', async () => {
        await PageObjects.datasetQuality.navigateTo();

        const apacheAccessDatasetHumanName = 'Apache access logs';
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const summary = await PageObjects.datasetQuality.parseFlyoutKpis(excludeKeysFromServerless);
        expect(summary).to.eql({
          docsCountTotal: '0',
          // size: '0.0 B', // `_stats` not available on Serverless
          services: '0',
          hosts: '0',
          degradedDocs: '0',
        });
      });

      it('shows the updated KPIs', async () => {
        const apacheAccessDatasetName = 'apache.access';
        const apacheAccessDatasetHumanName = 'Apache access logs';
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const summaryBefore = await PageObjects.datasetQuality.parseFlyoutKpis(
          excludeKeysFromServerless
        );

        // Set time range to 3 days ago
        const flyoutBodyContainer = await testSubjects.find(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutBody
        );
        await PageObjects.datasetQuality.setDatePickerLastXUnits(flyoutBodyContainer, 3, 'd');

        // Index 2 doc 2 days ago
        const time2DaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
        await synthtrace.index(
          getLogsForDataset({
            to: time2DaysAgo,
            count: 2,
            dataset: apacheAccessDatasetName,
            isMalformed: false,
          })
        );

        // Index 5 degraded docs 2 days ago
        await synthtrace.index(
          getLogsForDataset({
            to: time2DaysAgo,
            count: 5,
            dataset: apacheAccessDatasetName,
            isMalformed: true,
          })
        );

        await PageObjects.datasetQuality.refreshFlyout();
        const summaryAfter = await PageObjects.datasetQuality.parseFlyoutKpis(
          excludeKeysFromServerless
        );

        expect(parseInt(summaryAfter.docsCountTotal, 10)).to.be.greaterThan(
          parseInt(summaryBefore.docsCountTotal, 10)
        );

        expect(parseInt(summaryAfter.degradedDocs, 10)).to.be.greaterThan(
          parseInt(summaryBefore.degradedDocs, 10)
        );

        // `_stats` not available on Serverless so we can't compare size // https://github.com/elastic/kibana/issues/178954
        // expect(parseInt(summaryAfter.size, 10)).to.be.greaterThan(parseInt(summaryBefore.size, 10));

        expect(parseInt(summaryAfter.services, 10)).to.be.greaterThan(
          parseInt(summaryBefore.services, 10)
        );
        expect(parseInt(summaryAfter.hosts, 10)).to.be.greaterThan(
          parseInt(summaryBefore.hosts, 10)
        );
      });

      it('shows the right number of services', async () => {
        const apacheAccessDatasetName = 'apache.access';
        const apacheAccessDatasetHumanName = 'Apache access logs';
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const summaryBefore = await PageObjects.datasetQuality.parseFlyoutKpis(
          excludeKeysFromServerless
        );
        const testServices = ['test-srv-1', 'test-srv-2'];

        // Index 2 docs with different services
        const timeNow = Date.now();
        await synthtrace.index(
          getLogsForDataset({
            to: timeNow,
            count: 2,
            dataset: apacheAccessDatasetName,
            isMalformed: false,
            services: testServices,
          })
        );

        await PageObjects.datasetQuality.refreshFlyout();
        const summaryAfter = await PageObjects.datasetQuality.parseFlyoutKpis(
          excludeKeysFromServerless
        );

        expect(parseInt(summaryAfter.services, 10)).to.eql(
          parseInt(summaryBefore.services, 10) + testServices.length
        );
      });

      it('goes to log explorer for degraded docs when show all is clicked', async () => {
        const apacheAccessDatasetName = 'apache.access';
        const apacheAccessDatasetHumanName = 'Apache access logs';
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const degradedDocsShowAllSelector = `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutKpiLink}-${PageObjects.datasetQuality.texts.degradedDocs}`;
        await testSubjects.click(degradedDocsShowAllSelector);
        await browser.switchTab(1);

        // Confirm dataset selector text in observability logs explorer
        const datasetSelectorText =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
        expect(datasetSelectorText).to.contain(apacheAccessDatasetName);

        await browser.closeCurrentWindow();
        await browser.switchTab(0);
      });

      // Blocked by https://github.com/elastic/kibana/issues/181705
      it.skip('goes to infra hosts for hosts when show all is clicked', async () => {
        const apacheAccessDatasetHumanName = 'Apache access logs';
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const hostsShowAllSelector = `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutKpiLink}-${PageObjects.datasetQuality.texts.hosts}`;
        await testSubjects.click(hostsShowAllSelector);
        await browser.switchTab(1);

        // Confirm url contains metrics/hosts
        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          expect(parsedUrl.pathname).to.contain('/app/metrics/hosts');
        });

        await browser.closeCurrentWindow();
        await browser.switchTab(0);
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

        await retry.tryForTime(5000, async () => {
          const action = await PageObjects.datasetQuality.getIntegrationActionButtonByAction(
            integrationActions.template
          );

          await action.click();

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

    // The above describe block has some failing/flaky tests which will
    // be fixed as part of the tech debt mentioned here
    // https://github.com/elastic/kibana/issues/184145
    // Until then, the below describe block is added to cover the tests for the
    // newly added degraded Fields Table. This must be merged under the above
    // describe block once the tech debt is fixed.
    describe('Dataset quality flyout with degraded fields', () => {
      const goodDatasetName = 'good';
      const degradedDatasetName = 'degraded';
      const today = new Date().toISOString();
      before(async () => {
        await PageObjects.svlCommonPage.loginWithRole('admin');
        await synthtrace.index([
          getLogsForDataset({
            to: today,
            count: 2,
            dataset: goodDatasetName,
            isMalformed: false,
          }),
          createDegradedFieldsRecord({
            to: today,
            count: 2,
            dataset: degradedDatasetName,
          }),
        ]);
        await PageObjects.datasetQuality.navigateTo();
      });

      after(async () => {
        await synthtrace.clean();
      });

      it('shows the degraded fields table with no data when no degraded fields are present', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(goodDatasetName);

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutDegradedTableNoData
        );

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should load the degraded fields table with data', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutDegradedFieldTable
        );

        const rows =
          await PageObjects.datasetQuality.getDatasetQualityFlyoutDegradedFieldTableRows();

        expect(rows.length).to.eql(2);

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should sort the table when the count table header is clicked', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();

        const countColumn = table.Count;
        const cellTexts = await countColumn.getCellTexts();

        await countColumn.sort('ascending');
        const sortedCellTexts = await countColumn.getCellTexts();

        expect(cellTexts.reverse()).to.eql(sortedCellTexts);

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should update the table when new data is ingested and the flyout is refreshed using the time selector', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();

        const countColumn = table.Count;
        const cellTexts = await countColumn.getCellTexts();

        await synthtrace.index([
          createDegradedFieldsRecord({
            to: today,
            count: 2,
            dataset: degradedDatasetName,
          }),
        ]);

        await PageObjects.datasetQuality.refreshFlyout();

        const updatedCellTexts = await countColumn.getCellTexts();

        const singleValuePreviously = parseInt(cellTexts[0], 10);
        const singleValueNow = parseInt(updatedCellTexts[0], 10);

        expect(singleValueNow).to.be(singleValuePreviously * 2);

        await PageObjects.datasetQuality.closeFlyout();
      });
    });
  });
}
