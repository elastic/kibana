/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const retry = getService('retry');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'error', 'timePicker', 'security']);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');

  const testData = {
    latencyCorrelationsTab: 'Latency correlations',
    logLogChartTitle: 'Latency distribution',
    serviceName: 'opbeans-go',
    transactionsTab: 'Transactions',
    transaction: 'GET /api/stats',
  };

  describe('latency correlations', () => {
    describe('space with no features disabled', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/metrics_and_apm');
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it('shows apm navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('APM');
      });

      it('can navigate to APM app', async () => {
        await PageObjects.common.navigateToApp('apm');

        await retry.try(async () => {
          await testSubjects.existOrFail('apmMainContainer', {
            timeout: 10000,
          });

          const apmMainContainerText = await testSubjects.getVisibleTextAll('apmMainContainer');
          const apmMainContainerTextItems = apmMainContainerText[0].split('\n');
          expect(apmMainContainerTextItems).to.contain('No services found');
        });
      });

      it('sets the timePicker to return data', async () => {
        await PageObjects.timePicker.timePickerExists();

        const fromTime = 'Jul 29, 2019 @ 00:00:00.000';
        const toTime = 'Jul 30, 2019 @ 00:00:00.000';
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);

        await retry.try(async () => {
          const apmMainContainerText = await testSubjects.getVisibleTextAll('apmMainContainer');
          const apmMainContainerTextItems = apmMainContainerText[0].split('\n');

          expect(apmMainContainerTextItems).to.not.contain('No services found');

          expect(apmMainContainerTextItems).to.contain('opbeans-go');
          expect(apmMainContainerTextItems).to.contain('opbeans-node');
          expect(apmMainContainerTextItems).to.contain('opbeans-ruby');
          expect(apmMainContainerTextItems).to.contain('opbeans-python');
          expect(apmMainContainerTextItems).to.contain('opbeans-dotnet');
          expect(apmMainContainerTextItems).to.contain('opbeans-java');

          expect(apmMainContainerTextItems).to.contain('development');

          const items = await testSubjects.findAll('apmServiceListAppLink');
          expect(items.length).to.be(6);
        });
      });

      it(`navigates to the 'opbeans-go' service overview page`, async function () {
        await find.clickByDisplayedLinkText(testData.serviceName);

        await retry.try(async () => {
          const apmMainTemplateHeaderServiceName = await testSubjects.getVisibleTextAll(
            'apmMainTemplateHeaderServiceName'
          );
          expect(apmMainTemplateHeaderServiceName).to.contain(testData.serviceName);
        });
      });

      it('navigates to the transactions tab', async function () {
        await find.clickByDisplayedLinkText(testData.transactionsTab);

        await retry.try(async () => {
          const apmMainContainerText = await testSubjects.getVisibleTextAll('apmMainContainer');
          const apmMainContainerTextItems = apmMainContainerText[0].split('\n');

          expect(apmMainContainerTextItems).to.contain(testData.transaction);
        });
      });

      it(`navigates to the 'GET /api/stats' transactions`, async function () {
        await find.clickByDisplayedLinkText(testData.transaction);

        await retry.try(async () => {
          const apmMainContainerText = await testSubjects.getVisibleTextAll('apmMainContainer');
          const apmMainContainerTextItems = apmMainContainerText[0].split('\n');

          expect(apmMainContainerTextItems).to.contain(testData.transaction);
          expect(apmMainContainerTextItems).to.contain(testData.latencyCorrelationsTab);

          // The default tab 'Trace samples' should show the log log chart without the correlations analysis part.
          // First assert that the log log chart and its header are present
          const apmTransactionDistributionChartTitle = await testSubjects.getVisibleText(
            'apmTransactionDistributionChartTitle'
          );
          expect(apmTransactionDistributionChartTitle).to.be(testData.logLogChartTitle);
          await testSubjects.existOrFail('apmCorrelationsChart');
          // Then assert that the correlation analysis part is not present
          await testSubjects.missingOrFail('apmCorrelationsLatencyCorrelationsTablePanelTitle');
        });
      });

      it('shows the correlations tab', async function () {
        await testSubjects.click('apmLatencyCorrelationsTabButton');

        await retry.try(async () => {
          await testSubjects.existOrFail('apmLatencyCorrelationsTabContent');
        });
      });

      it('loads the correlation results', async function () {
        await retry.try(async () => {
          // Assert that the data fully loaded to 100%
          const apmLatencyCorrelationsProgressTitle = await testSubjects.getVisibleText(
            'apmCorrelationsProgressTitle'
          );
          expect(apmLatencyCorrelationsProgressTitle).to.be('Progress: 100%');

          // Assert that the Correlations Chart and its header are present
          const apmCorrelationsLatencyCorrelationsChartTitle = await testSubjects.getVisibleText(
            'apmCorrelationsLatencyCorrelationsChartTitle'
          );
          expect(apmCorrelationsLatencyCorrelationsChartTitle).to.be(testData.logLogChartTitle);
          await testSubjects.existOrFail('apmCorrelationsChart');
          await testSubjects.existOrFail('apmCorrelationsLatencyCorrelationsTablePanelTitle');

          // Assert that results for the given service didn't find any correlations
          const apmCorrelationsTable = await testSubjects.getVisibleText('apmCorrelationsTable');
          expect(apmCorrelationsTable).to.be(
            'No significant correlations\nCorrelations will only be identified if they have significant impact.\nTry selecting another time range or remove any added filter.'
          );
        });
      });
    });
  });
}
