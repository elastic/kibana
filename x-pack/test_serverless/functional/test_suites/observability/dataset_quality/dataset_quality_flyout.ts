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
  productionNamespace,
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

  const apacheAccessDatasetName = 'apache.access';
  const apacheAccessDatasetHumanName = 'Apache access logs';
  const apacheIntegrationId = 'apache';
  const apachePkg = {
    name: 'apache',
    version: '1.14.0',
  };

  const bitbucketDatasetName = 'atlassian_bitbucket.audit';
  const bitbucketDatasetHumanName = 'Bitbucket Audit Logs';
  const bitbucketPkg = {
    name: 'atlassian_bitbucket',
    version: '1.14.0',
  };

  const degradedDatasetName = datasetNames[2];

  describe('Flyout', function () {
    before(async () => {
      // Install Apache Integration and ingest logs for it
      await PageObjects.observabilityLogsExplorer.installPackage(apachePkg);

      // Install Bitbucket Integration (package which does not has Dashboards) and ingest logs for it
      await PageObjects.observabilityLogsExplorer.installPackage(bitbucketPkg);

      await synthtrace.index([
        // Ingest basic logs
        getInitialTestLogs({ to, count: 4 }),
        // Ingest Degraded Logs
        createDegradedFieldsRecord({
          to: new Date().toISOString(),
          count: 2,
          dataset: degradedDatasetName,
        }),
        // Index 15 logs for `logs-apache.access` dataset
        getLogsForDataset({
          to: new Date().toISOString(),
          count: 15,
          dataset: apacheAccessDatasetName,
          namespace: productionNamespace,
        }),
        // Index degraded docs for Apache integration
        getLogsForDataset({
          to: new Date().toISOString(),
          count: 1,
          dataset: apacheAccessDatasetName,
          namespace: productionNamespace,
          isMalformed: true,
        }),
        // Index logs for Bitbucket integration
        getLogsForDataset({ to, count: 10, dataset: bitbucketDatasetName }),
      ]);

      await PageObjects.svlCommonPage.loginWithRole('admin');

      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await PageObjects.observabilityLogsExplorer.uninstallPackage(apachePkg);
      await PageObjects.observabilityLogsExplorer.uninstallPackage(bitbucketPkg);
      await synthtrace.clean();
    });

    describe('open flyout', () => {
      it('should open the flyout for the right dataset', async () => {
        const testDatasetName = datasetNames[1];

        await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutTitle
        );

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('reflects the breakdown field state in url', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

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
        await PageObjects.datasetQuality.closeFlyout();
      });
    });

    describe('integrations', () => {
      it('should hide the integration section for non integrations', async () => {
        const testDatasetName = datasetNames[1];

        await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors
            .datasetQualityFlyoutFieldsListIntegrationDetails
        );

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should shows the integration section for integrations', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors
            .datasetQualityFlyoutFieldsListIntegrationDetails
        );

        await retry.tryForTime(5000, async () => {
          const integrationNameExists = await PageObjects.datasetQuality.doesTextExist(
            PageObjects.datasetQuality.testSubjectSelectors
              .datasetQualityFlyoutFieldsListIntegrationDetails,
            apacheIntegrationId
          );
          expect(integrationNameExists).to.be(true);
        });

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should show the integration actions menu with correct actions', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);
        await PageObjects.datasetQuality.openIntegrationActionsMenu();

        const actions = await Promise.all(
          Object.values(integrationActions).map((action) =>
            PageObjects.datasetQuality.getIntegrationActionButtonByAction(action)
          )
        );

        expect(actions.length).to.eql(3);
        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should hide integration dashboard for integrations without dashboards', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(bitbucketDatasetHumanName);
        await PageObjects.datasetQuality.openIntegrationActionsMenu();

        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutIntegrationAction(
            integrationActions.viewDashboards
          )
        );
        await PageObjects.datasetQuality.closeFlyout();
      });

      it('Should navigate to integration overview page on clicking integration overview action', async () => {
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

        await PageObjects.datasetQuality.navigateTo();
      });

      it('should navigate to index template page in clicking Integration template', async () => {
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
        await PageObjects.datasetQuality.navigateTo();
      });

      it('should navigate to the selected dashboard on clicking integration dashboard action ', async () => {
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

        await PageObjects.datasetQuality.navigateTo();
      });
    });

    describe('summary panel', () => {
      it('should show summary KPIs', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const { docsCountTotal, degradedDocs, services, hosts } =
          await PageObjects.datasetQuality.parseFlyoutKpis(excludeKeysFromServerless);
        expect(parseInt(docsCountTotal, 10)).to.be(226);
        expect(parseInt(degradedDocs, 10)).to.be(1);
        expect(parseInt(services, 10)).to.be(3);
        expect(parseInt(hosts, 10)).to.be(52);

        await PageObjects.datasetQuality.closeFlyout();
      });
    });

    describe('navigation', () => {
      afterEach(async () => {
        // Navigate back to dataset quality page after each test
        await PageObjects.datasetQuality.navigateTo();
      });

      it('should go to log explorer page when the open in log explorer button is clicked', async () => {
        const testDatasetName = datasetNames[2];
        await PageObjects.datasetQuality.openDatasetFlyout(testDatasetName);

        const logExplorerButton = await PageObjects.datasetQuality.getFlyoutLogsExplorerButton();

        await logExplorerButton.click();

        // Confirm dataset selector text in observability logs explorer
        const datasetSelectorText =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
        expect(datasetSelectorText).to.eql(testDatasetName);
      });

      it('should go log explorer for degraded docs when the show all button is clicked', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const degradedDocsShowAllSelector = `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutKpiLink}-${PageObjects.datasetQuality.texts.degradedDocs}`;
        await testSubjects.click(degradedDocsShowAllSelector);

        // Confirm dataset selector text in observability logs explorer
        const datasetSelectorText =
          await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButtonText();
        expect(datasetSelectorText).to.contain(apacheAccessDatasetName);
      });

      // Blocked by https://github.com/elastic/kibana/issues/181705
      // Its a test written ahead of its time.
      it.skip('goes to infra hosts for hosts when show all is clicked', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(apacheAccessDatasetHumanName);

        const hostsShowAllSelector = `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutKpiLink}-${PageObjects.datasetQuality.texts.hosts}`;
        await testSubjects.click(hostsShowAllSelector);

        // Confirm url contains metrics/hosts
        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          expect(parsedUrl.pathname).to.contain('/app/metrics/hosts');
        });
      });
    });

    describe('degraded fields table', () => {
      it(' should show empty degraded fields table when no degraded fields are present', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(datasetNames[0]);

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutDegradedTableNoData
        );

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should show the degraded fields table with data when present', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityFlyoutDegradedFieldTable
        );

        const rows =
          await PageObjects.datasetQuality.getDatasetQualityFlyoutDegradedFieldTableRows();

        expect(rows.length).to.eql(2);

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should display Spark Plot for every row of degraded fields', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        const rows =
          await PageObjects.datasetQuality.getDatasetQualityFlyoutDegradedFieldTableRows();

        const sparkPlots = await testSubjects.findAll(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualitySparkPlot
        );

        expect(rows.length).to.be(sparkPlots.length);

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should sort the table when the count table header is clicked', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();

        const countColumn = table['Docs count'];
        const cellTexts = await countColumn.getCellTexts();

        await countColumn.sort('ascending');
        const sortedCellTexts = await countColumn.getCellTexts();

        expect(cellTexts.reverse()).to.eql(sortedCellTexts);

        await PageObjects.datasetQuality.closeFlyout();
      });

      it('should update the URL when the table is sorted', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();
        const countColumn = table['Docs count'];

        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          const pageState = parsedUrl.searchParams.get('pageState');

          expect(decodeURIComponent(pageState as string)).to.contain(
            'sort:(direction:desc,field:count)'
          );
        });

        countColumn.sort('ascending');

        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          const pageState = parsedUrl.searchParams.get('pageState');

          expect(decodeURIComponent(pageState as string)).to.contain(
            'sort:(direction:asc,field:count)'
          );
        });

        await PageObjects.datasetQuality.closeFlyout();
      });

      // This is the only test which ingest data during the test.
      // This block tests the refresh behavior of the degraded fields table.
      // Even though this test ingest data, it can also be freely moved inside
      // this describe block, and it won't affect any of the existing tests
      it('should update the table when new data is ingested and the flyout is refreshed using the time selector', async () => {
        await PageObjects.datasetQuality.openDatasetFlyout(degradedDatasetName);

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();

        const countColumn = table['Docs count'];
        const cellTexts = await countColumn.getCellTexts();

        await synthtrace.index([
          createDegradedFieldsRecord({
            to: new Date().toISOString(),
            count: 2,
            dataset: degradedDatasetName,
          }),
        ]);

        await PageObjects.datasetQuality.refreshFlyout();

        const updatedTable = await PageObjects.datasetQuality.parseDegradedFieldTable();
        const updatedCountColumn = updatedTable['Docs count'];

        const updatedCellTexts = await updatedCountColumn.getCellTexts();

        const singleValuePreviously = parseInt(cellTexts[0], 10);
        const singleValueNow = parseInt(updatedCellTexts[0], 10);

        expect(singleValueNow).to.be.greaterThan(singleValuePreviously);

        await PageObjects.datasetQuality.closeFlyout();
      });
    });
  });
}
