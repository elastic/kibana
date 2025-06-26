/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import originalExpect from 'expect';
import { defaultNamespace } from '@kbn/test-suites-xpack/functional/apps/dataset_quality/data';
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
    'discover',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonPage',
  ]);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('svlLogsSynthtraceClient');
  const retry = getService('retry');
  const browser = getService('browser');
  const to = '2024-01-01T12:00:00.000Z';

  const apacheAccessDatasetName = 'apache.access';
  const apacheAccessDataStreamName = `logs-${apacheAccessDatasetName}-${productionNamespace}`;
  const apacheIntegrationId = 'apache';
  const apachePkg = {
    name: 'apache',
    version: '1.14.0',
  };

  const bitbucketDatasetName = 'atlassian_bitbucket.audit';
  const bitbucketAuditDataStreamName = `logs-${bitbucketDatasetName}-${defaultNamespace}`;
  const bitbucketPkg = {
    name: 'atlassian_bitbucket',
    version: '1.14.0',
  };

  const regularDatasetName = datasetNames[0];
  const regularDataStreamName = `logs-${datasetNames[0]}-${defaultNamespace}`;
  const degradedDatasetName = datasetNames[2];
  const degradedDataStreamName = `logs-${degradedDatasetName}-${defaultNamespace}`;

  describe('Dataset quality details', function () {
    // see details: https://github.com/elastic/kibana/issues/206734

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

      await PageObjects.svlCommonPage.loginAsViewer();
    });

    after(async () => {
      await PageObjects.observabilityLogsExplorer.uninstallPackage(apachePkg);
      await PageObjects.observabilityLogsExplorer.uninstallPackage(bitbucketPkg);
      await synthtrace.clean();
    });

    describe('navigate to dataset details', () => {
      it('should navigate to right dataset', async () => {
        await PageObjects.datasetQuality.navigateToDetails({ dataStream: regularDataStreamName });

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsTitle
        );
      });

      it('should navigate to details page from a main page', async () => {
        await PageObjects.datasetQuality.navigateTo();

        const synthDataset = await testSubjects.find(
          'datasetQualityTableDetailsLink-logs-synth.1-default',
          20 * 1000
        );

        await synthDataset.click();

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsTitle
        );
      });

      it('should show an empty prompt with error message when the dataset is not found', async () => {
        const nonExistentDataStreamName = 'logs-non.existent-production';
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: nonExistentDataStreamName,
        });

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsEmptyPrompt
        );

        const emptyPromptBody = await testSubjects.getVisibleText(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsEmptyPromptBody
        );

        expect(emptyPromptBody).to.contain(nonExistentDataStreamName);
      });

      it('reflects the breakdown field state in url', async () => {
        await PageObjects.datasetQuality.navigateToDetails({ dataStream: degradedDataStreamName });

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
    });

    // FLAKY: https://github.com/elastic/kibana/issues/194575
    describe.skip('overview summary panel', () => {
      it('should show summary KPIs', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: apacheAccessDataStreamName,
        });

        const { docsCountTotal, degradedDocs, services, hosts, size } =
          await PageObjects.datasetQuality.parseOverviewSummaryPanelKpis();
        expect(parseInt(docsCountTotal, 10)).to.be(226);
        expect(parseInt(degradedDocs, 10)).to.be(1);
        expect(parseInt(services, 10)).to.be(3);
        expect(parseInt(hosts, 10)).to.be(52);
        // metering stats API is cached for 30seconds, waiting for the exact value is not optimal in this case
        // rather we can just check if any value is present
        expect(size).to.be.ok();
      });
    });

    describe('overview integrations', () => {
      it('should hide the integration section for non integrations', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: regularDataStreamName,
        });

        // The Integration row should not be present
        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors
            .datasetQualityDetailsIntegrationRowIntegration
        );

        // The Version row should not be present
        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsIntegrationRowVersion
        );
      });

      it('should shows the integration section for integrations', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: apacheAccessDataStreamName,
        });

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors
            .datasetQualityDetailsIntegrationRowIntegration
        );

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsIntegrationRowVersion
        );

        await retry.tryForTime(5000, async () => {
          const integrationNameExists = await PageObjects.datasetQuality.doesTextExist(
            PageObjects.datasetQuality.testSubjectSelectors
              .datasetQualityDetailsIntegrationRowIntegration,
            apacheIntegrationId
          );
          expect(integrationNameExists).to.be(true);
        });
      });

      it('should show the integration actions menu with correct actions', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: apacheAccessDataStreamName,
        });

        await PageObjects.datasetQuality.openIntegrationActionsMenu();

        const actions = await Promise.all(
          Object.values(integrationActions).map((action) =>
            PageObjects.datasetQuality.getIntegrationActionButtonByAction(action)
          )
        );

        expect(actions.length).to.eql(3);
      });

      it('should hide integration dashboard for integrations without dashboards', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: bitbucketAuditDataStreamName,
        });

        await PageObjects.datasetQuality.openIntegrationActionsMenu();

        await testSubjects.missingOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsIntegrationAction(
            integrationActions.viewDashboards
          )
        );
      });

      it('Should navigate to integration overview page on clicking integration overview action', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: bitbucketAuditDataStreamName,
        });
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

      it('should navigate to index template page in clicking Integration template', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: apacheAccessDataStreamName,
        });
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

      it('should navigate to the selected dashboard on clicking integration dashboard action ', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: apacheAccessDataStreamName,
        });
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

    describe('navigation', () => {
      it('should go to discover page when the open in discover button is clicked', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: regularDataStreamName,
        });

        const discoverButton =
          await PageObjects.datasetQuality.getDatasetQualityDetailsHeaderButton();

        await discoverButton.click();

        // Confirm dataset selector text in discover
        await retry.tryForTime(5000, async () => {
          const datasetSelectorText = await PageObjects.discover.getCurrentDataViewId();

          originalExpect(datasetSelectorText).toMatch(regularDatasetName);
        });
      });

      it('should go discover for degraded docs when the button next to breakdown selector is clicked', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: apacheAccessDataStreamName,
        });

        await testSubjects.click(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsLinkToDiscover
        );

        // Confirm dataset selector text in discover
        await retry.tryForTime(5000, async () => {
          const datasetSelectorText = await PageObjects.discover.getCurrentDataViewId();
          originalExpect(datasetSelectorText).toMatch(apacheAccessDatasetName);
        });
      });
    });

    describe('degraded fields table', () => {
      it(' should show empty degraded fields table when no degraded fields are present', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: regularDataStreamName,
        });

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedTableNoData
        );
      });

      it('should show the degraded fields table with data and spark plots when present', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: degradedDataStreamName,
        });

        await testSubjects.existOrFail(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualityDetailsDegradedFieldTable
        );

        const rows =
          await PageObjects.datasetQuality.getDatasetQualityDetailsDegradedFieldTableRows();

        expect(rows.length).to.eql(3);

        const sparkPlots = await testSubjects.findAll(
          PageObjects.datasetQuality.testSubjectSelectors.datasetQualitySparkPlot
        );

        expect(rows.length).to.be(sparkPlots.length);
      });

      it('should sort the table when the count table header is clicked', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: degradedDataStreamName,
        });

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();

        const countColumn = table[PageObjects.datasetQuality.texts.datasetDocsCountColumn];
        const cellTexts = await countColumn.getCellTexts();

        await countColumn.sort('ascending');
        const sortedCellTexts = await countColumn.getCellTexts();

        expect(cellTexts.reverse()).to.eql(sortedCellTexts);
      });

      it('should update the URL when the table is sorted', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: degradedDataStreamName,
        });

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();
        const countColumn = table[PageObjects.datasetQuality.texts.datasetDocsCountColumn];

        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          const pageState = parsedUrl.searchParams.get('pageState');

          expect(decodeURIComponent(pageState as string)).to.contain(
            'sort:(direction:desc,field:count)'
          );
        });

        await countColumn.sort('ascending');

        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          const pageState = parsedUrl.searchParams.get('pageState');

          expect(decodeURIComponent(pageState as string)).to.contain(
            'sort:(direction:asc,field:count)'
          );
        });
      });

      // This is the only test which ingest data during the test.
      // This block tests the refresh behavior of the degraded fields table.
      // Even though this test ingest data, it can also be freely moved inside
      // this describe block, and it won't affect any of the existing tests
      it('should update the table when new data is ingested and the flyout is refreshed using the time selector', async () => {
        await PageObjects.datasetQuality.navigateToDetails({
          dataStream: degradedDataStreamName,
        });

        const table = await PageObjects.datasetQuality.parseDegradedFieldTable();

        const countColumn = table[PageObjects.datasetQuality.texts.datasetDocsCountColumn];
        const cellTexts = await countColumn.getCellTexts();

        await synthtrace.index([
          createDegradedFieldsRecord({
            to: new Date().toISOString(),
            count: 2,
            dataset: degradedDatasetName,
          }),
        ]);

        await PageObjects.datasetQuality.refreshDetailsPageData();

        const updatedTable = await PageObjects.datasetQuality.parseDegradedFieldTable();
        const updatedCountColumn =
          updatedTable[PageObjects.datasetQuality.texts.datasetDocsCountColumn];

        const updatedCellTexts = await updatedCountColumn.getCellTexts();

        const singleValuePreviously = parseInt(cellTexts[0], 10);
        const singleValueNow = parseInt(updatedCellTexts[0], 10);

        expect(singleValueNow).to.be.greaterThan(singleValuePreviously);
      });
    });
  });
}
