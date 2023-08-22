/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, NODE_DETAILS_PATH } from './constants';

const START_HOST_ALERTS_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_HOST_ALERTS_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const START_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataStartDate);
const END_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataEndDate);

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const observability = getService('observability');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['assetDetails', 'common', 'infraHome', 'header']);

  const getNodeDetailsUrl = (assetName: string, dateRange: { from: string; to: string }) => {
    const queryParams = new URLSearchParams();

    queryParams.set(
      '_a',
      rison.encode({
        autoReload: false,
        refreshInterval: 5000,
        time: { ...dateRange, interval: '>1m' },
      })
    );

    queryParams.set('assetName', assetName);

    return queryParams.toString();
  };

  const navigateToNodeDetails = async (
    assetId: string,
    assetName: string,
    dateRange: { from: string; to: string }
  ) => {
    await pageObjects.common.navigateToUrlWithBrowserHistory(
      'infraOps',
      `/${NODE_DETAILS_PATH}/${assetId}`,
      getNodeDetailsUrl(assetName, dateRange),
      {
        insertTimestamp: false,
        ensureCurrentUrl: false,
        useActualUrl: true,
      }
    );
  };

  describe('Node Details', () => {
    describe('#With Asset Details', () => {
      describe('#Asset Type: host', () => {
        before(async () => {
          await Promise.all([
            esArchiver.load('x-pack/test/functional/es_archives/infra/alerts'),
            esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
            esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
            kibanaServer.savedObjects.cleanStandardList(),
          ]);
          await browser.setWindowSize(1600, 1200);

          await navigateToNodeDetails('Jennys-MBP.fritz.box', 'Jennys-MBP.fritz.box', {
            from: START_HOST_PROCESSES_DATE.toISOString(),
            to: END_HOST_PROCESSES_DATE.toISOString(),
          });

          await pageObjects.header.waitUntilLoadingHasFinished();
        });

        after(async () => {
          await Promise.all([
            esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts'),
            esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
            esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
          ]);
        });

        describe('Overview Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOverviewFlyoutTab();
          });

          [
            { metric: 'cpuUsage', value: '13.9%' },
            { metric: 'normalizedLoad1m', value: '18.8%' },
            { metric: 'memoryUsage', value: '94.9%' },
            { metric: 'diskSpaceUsage', value: 'N/A' },
          ].forEach(({ metric, value }) => {
            it(`${metric} tile should show ${value}`, async () => {
              await retry.tryForTime(3 * 1000, async () => {
                const tileValue = await pageObjects.assetDetails.getAssetDetailsKPITileValue(
                  metric
                );
                expect(tileValue).to.eql(value);
              });
            });
          });

          it('should render 8 charts in the Metrics section', async () => {
            const hosts = await pageObjects.assetDetails.getAssetDetailsMetricsCharts();
            expect(hosts.length).to.equal(8);
          });

          it('should show alerts', async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            await pageObjects.assetDetails.overviewAlertsTitleExists();
          });
        });

        describe('Metadata Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetadataFlyoutTab();
          });

          it('should show metadata table', async () => {
            await pageObjects.assetDetails.metadataTableExists();
          });

          it('should render metadata tab, pin and unpin table row', async () => {
            // Add Pin
            await pageObjects.assetDetails.clickAddMetadataPin();
            expect(await pageObjects.assetDetails.metadataRemovePinExists()).to.be(true);

            // Persist pin after refresh
            await browser.refresh();
            await retry.try(async () => {
              // Temporary until URL state isn't implemented
              await pageObjects.assetDetails.clickMetadataFlyoutTab();
              await pageObjects.infraHome.waitForLoading();
              const removePinExist = await pageObjects.assetDetails.metadataRemovePinExists();
              expect(removePinExist).to.be(true);
            });

            // Remove Pin
            await pageObjects.assetDetails.clickRemoveMetadataPin();
            expect(await pageObjects.assetDetails.metadataRemovePinExists()).to.be(false);
          });
        });

        describe('Processes Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickProcessesFlyoutTab();
          });

          it('should render processes tab and with Total Value summary', async () => {
            const processesTotalValue =
              await pageObjects.assetDetails.getProcessesTabContentTotalValue();
            const processValue = await processesTotalValue.getVisibleText();
            expect(processValue).to.eql('313');
          });

          it('should expand processes table row', async () => {
            await pageObjects.assetDetails.processesTableExists();
            await pageObjects.assetDetails.getProcessesTableBody();
            await pageObjects.assetDetails.clickProcessesTableExpandButton();
          });
        });

        describe('Logs Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickLogsFlyoutTab();
          });
          it('should render logs tab', async () => {
            await testSubjects.existOrFail('infraAssetDetailsLogsTabContent');
          });
        });

        describe('Host with alerts and no processes', () => {
          before(async () => {
            await navigateToNodeDetails('demo-stack-mysql-01', 'demo-stack-mysql-01', {
              from: START_HOST_ALERTS_DATE.toISOString(),
              to: END_HOST_ALERTS_DATE.toISOString(),
            });
          });

          it('should render alerts count for a host inside a flyout', async () => {
            await pageObjects.assetDetails.clickOverviewFlyoutTab();

            retry.tryForTime(30 * 1000, async () => {
              await observability.components.alertSummaryWidget.getFullSizeComponentSelectorOrFail();
            });

            const activeAlertsCount =
              await observability.components.alertSummaryWidget.getActiveAlertCount();
            const totalAlertsCount =
              await observability.components.alertSummaryWidget.getTotalAlertCount();

            expect(activeAlertsCount.trim()).to.equal('2');
            expect(totalAlertsCount.trim()).to.equal('3');
          });

          it('should render "N/A" when processes summary is not available in flyout', async () => {
            await pageObjects.assetDetails.clickProcessesFlyoutTab();
            const processesTotalValue =
              await pageObjects.assetDetails.getProcessesTabContentTotalValue();
            const processValue = await processesTotalValue.getVisibleText();
            expect(processValue).to.eql('N/A');
          });
        });
      });
    });
  });
};
