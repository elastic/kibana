/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { enableInfrastructureProfilingIntegration } from '@kbn/observability-plugin/common';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, NODE_DETAILS_PATH, DATE_PICKER_FORMAT } from './constants';

const START_HOST_ALERTS_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_HOST_ALERTS_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const START_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataStartDate);
const END_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataEndDate);
const START_HOST_KUBERNETES_SECTION_DATE = moment.utc(
  DATES.metricsAndLogs.hosts.kubernetesSectionStartDate
);
const END_HOST_KUBERNETES_SECTION_DATE = moment.utc(
  DATES.metricsAndLogs.hosts.kubernetesSectionEndDate
);

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const observability = getService('observability');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'assetDetails',
    'common',
    'infraHome',
    'header',
    'timePicker',
  ]);

  const getNodeDetailsUrl = (assetName: string) => {
    const queryParams = new URLSearchParams();

    queryParams.set('assetName', assetName);

    return queryParams.toString();
  };

  const navigateToNodeDetails = async (assetId: string, assetName: string) => {
    await pageObjects.common.navigateToUrlWithBrowserHistory(
      'infraOps',
      `/${NODE_DETAILS_PATH}/${assetId}`,
      getNodeDetailsUrl(assetName),
      {
        insertTimestamp: false,
        ensureCurrentUrl: false,
        useActualUrl: true,
      }
    );
  };

  const refreshPageWithDelay = async () => {
    /**
     * Delay gives React a chance to finish
     * running effects (like updating the URL) before
     * refreshing the page.
     */
    await pageObjects.common.sleep(1000);
    await browser.refresh();
  };

  const setInfrastructureProfilingIntegrationUiSetting = async (value: boolean = true) => {
    await kibanaServer.uiSettings.update({ [enableInfrastructureProfilingIntegration]: value });
    await browser.refresh();
    await pageObjects.header.waitUntilLoadingHasFinished();
  };

  describe('Node Details', () => {
    describe('#With Asset Details', () => {
      before(async () => {
        await Promise.all([
          esArchiver.load('x-pack/test/functional/es_archives/infra/alerts'),
          esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
          esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
          kibanaServer.savedObjects.cleanStandardList(),
        ]);
        await browser.setWindowSize(1600, 1200);

        await navigateToNodeDetails('Jennys-MBP.fritz.box', 'Jennys-MBP.fritz.box');
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      after(async () => {
        await Promise.all([
          esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts'),
          esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
          esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
        ]);
      });

      describe('#Date picker', () => {
        before(async () => {
          await pageObjects.assetDetails.clickOverviewTab();

          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
          );
        });

        after(async () => {
          await pageObjects.assetDetails.clickOverviewTab();
        });

        [
          { tab: 'metadata' },
          { tab: 'processes' },
          { tab: 'metrics' },
          { tab: 'logs' },
          { tab: 'anomalies' },
        ].forEach(({ tab }) => {
          it(`should keep the same date range across tabs: ${tab}`, async () => {
            const clickFuncs: Record<string, () => void> = {
              metadata: pageObjects.assetDetails.clickMetadataTab,
              processes: pageObjects.assetDetails.clickProcessesTab,
              logs: pageObjects.assetDetails.clickLogsTab,
              anomalies: pageObjects.assetDetails.clickAnomaliesTab,
              metrics: pageObjects.assetDetails.clickMetricsTab,
            };

            await clickFuncs[tab]();

            const datePickerValue = await pageObjects.timePicker.getTimeConfig();
            expect(await pageObjects.timePicker.timePickerExists()).to.be(true);
            expect(datePickerValue.start).to.equal(
              START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
            );
            expect(datePickerValue.end).to.equal(
              END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
            );
          });
        });

        it('preserves selected date range between page reloads', async () => {
          const start = moment.utc(START_HOST_ALERTS_DATE).format(DATE_PICKER_FORMAT);
          const end = moment.utc(END_HOST_ALERTS_DATE).format(DATE_PICKER_FORMAT);

          await pageObjects.timePicker.setAbsoluteRange(start, end);
          await refreshPageWithDelay();

          const datePickerValue = await pageObjects.timePicker.getTimeConfig();

          expect(datePickerValue.start).to.equal(start);
          expect(datePickerValue.end).to.equal(end);
        });
      });

      describe('#Asset Type: host', () => {
        before(async () => {
          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
          );
        });

        it('preserves selected tab between page reloads', async () => {
          await testSubjects.missingOrFail('infraAssetDetailsMetadataTable');
          await pageObjects.assetDetails.clickMetadataTab();
          await pageObjects.assetDetails.metadataTableExists();

          await refreshPageWithDelay();

          await pageObjects.assetDetails.metadataTableExists();
        });

        describe('Overview Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOverviewTab();
          });

          [
            { metric: 'cpuUsage', value: '13.9%' },
            { metric: 'normalizedLoad1m', value: '18.8%' },
            { metric: 'memoryUsage', value: '94.9%' },
            { metric: 'diskUsage', value: 'N/A' },
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

          [
            { metric: 'cpu', chartsCount: 2 },
            { metric: 'memory', chartsCount: 1 },
            { metric: 'disk', chartsCount: 2 },
            { metric: 'network', chartsCount: 1 },
          ].forEach(({ metric, chartsCount }) => {
            it(`should show ${metric} charts group the in metrics section`, async () => {
              await pageObjects.assetDetails.hostMetricsChartsGroupExists(metric);
            });

            it(`should render ${chartsCount} ${metric} charts in the Metrics section`, async () => {
              const hosts = await pageObjects.assetDetails.getOverviewTabHostMetricCharts(metric);
              expect(hosts.length).to.equal(chartsCount);
            });
          });

          it('should show all section as collapsable', async () => {
            await pageObjects.assetDetails.metadataSectionCollapsibleExist();
            await pageObjects.assetDetails.alertsSectionCollapsibleExist();
            await pageObjects.assetDetails.metricsSectionCollapsibleExist();
            await pageObjects.assetDetails.servicesSectionCollapsibleExist();
          });

          it('should show alerts', async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            await pageObjects.assetDetails.overviewAlertsTitleExists();
          });

          it('should show / hide alerts section with no alerts and show / hide closed section content', async () => {
            await pageObjects.assetDetails.alertsSectionCollapsibleExist();
            // Collapsed by default
            await pageObjects.assetDetails.alertsSectionClosedContentNoAlertsExist();
            // Expand
            await pageObjects.assetDetails.alertsSectionCollapsibleClick();
            await pageObjects.assetDetails.alertsSectionClosedContentNoAlertsMissing();
          });

          it('shows the CPU Profiling prompt if UI setting for Profiling integration is enabled', async () => {
            await setInfrastructureProfilingIntegrationUiSetting(true);
            await pageObjects.assetDetails.cpuProfilingPromptExists();
          });

          it('hides the CPU Profiling prompt if UI setting for Profiling integration is disabled', async () => {
            await setInfrastructureProfilingIntegrationUiSetting(false);
            await pageObjects.assetDetails.cpuProfilingPromptMissing();
          });

          describe('Alerts Section with alerts', () => {
            const ACTIVE_ALERTS = 2;
            const RECOVERED_ALERTS = 2;
            const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
            const COLUMNS = 11;
            before(async () => {
              await navigateToNodeDetails('demo-stack-apache-01', 'demo-stack-apache-01');
              await pageObjects.header.waitUntilLoadingHasFinished();

              await pageObjects.timePicker.setAbsoluteRange(
                START_HOST_ALERTS_DATE.format(DATE_PICKER_FORMAT),
                END_HOST_ALERTS_DATE.format(DATE_PICKER_FORMAT)
              );

              await pageObjects.assetDetails.clickOverviewTab();
            });

            after(async () => {
              await navigateToNodeDetails('Jennys-MBP.fritz.box', 'Jennys-MBP.fritz.box');
              await pageObjects.header.waitUntilLoadingHasFinished();

              await pageObjects.timePicker.setAbsoluteRange(
                START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT),
                END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
              );
            });

            it('should show / hide alerts section with active alerts and show / hide closed section content', async () => {
              await pageObjects.assetDetails.alertsSectionCollapsibleExist();
              // Expanded by default
              await pageObjects.assetDetails.alertsSectionClosedContentMissing();
              // Collapse
              await pageObjects.assetDetails.alertsSectionCollapsibleClick();
              await pageObjects.assetDetails.alertsSectionClosedContentExist();
              // Expand
              await pageObjects.assetDetails.alertsSectionCollapsibleClick();
              await pageObjects.assetDetails.alertsSectionClosedContentMissing();
            });

            it('should show alert summary ', async () => {
              await pageObjects.assetDetails.setAlertStatusFilter();
              await retry.try(async () => {
                const cells = await observability.alerts.common.getTableCells();
                expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
              });
            });

            it('can be filtered to only show "all" alerts using the filter button', async () => {
              await pageObjects.assetDetails.setAlertStatusFilter();
              await retry.try(async () => {
                const tableRows = await observability.alerts.common.getTableCellsInRows();
                expect(tableRows.length).to.be(ALL_ALERTS);
              });
            });

            it('can be filtered to only show "active" alerts using the filter button', async () => {
              await pageObjects.assetDetails.setAlertStatusFilter(ALERT_STATUS_ACTIVE);
              await retry.try(async () => {
                const tableRows = await observability.alerts.common.getTableCellsInRows();
                expect(tableRows.length).to.be(ACTIVE_ALERTS);
              });
              const pageUrl = await browser.getCurrentUrl();
              expect(pageUrl).to.contain('alertStatus%3Aactive');
            });

            it('can be filtered to only show "recovered" alerts using the filter button', async () => {
              await pageObjects.assetDetails.setAlertStatusFilter(ALERT_STATUS_RECOVERED);
              await retry.try(async () => {
                const tableRows = await observability.alerts.common.getTableCellsInRows();
                expect(tableRows.length).to.be(RECOVERED_ALERTS);
              });
              const pageUrl = await browser.getCurrentUrl();
              expect(pageUrl).to.contain('alertStatus%3Arecovered');
            });

            it('can be filtered to only show "untracked" alerts using the filter button', async () => {
              await pageObjects.assetDetails.setAlertStatusFilter(ALERT_STATUS_UNTRACKED);
              await observability.alerts.common.getNoDataStateOrFail();
              const pageUrl = await browser.getCurrentUrl();
              expect(pageUrl).to.contain('alertStatus%3Auntracked');
            });
          });
        });

        describe('Metadata Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetadataTab();
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
              await pageObjects.assetDetails.clickMetadataTab();
              await pageObjects.infraHome.waitForLoading();
              const removePinExist = await pageObjects.assetDetails.metadataRemovePinExists();
              expect(removePinExist).to.be(true);
            });

            // Remove Pin
            await pageObjects.assetDetails.clickRemoveMetadataPin();
            expect(await pageObjects.assetDetails.metadataRemovePinExists()).to.be(false);
          });

          it('preserves search term between page reloads', async () => {
            const searchInput = await pageObjects.assetDetails.getMetadataSearchField();

            expect(await searchInput.getAttribute('value')).to.be('');

            await searchInput.type('test');
            await refreshPageWithDelay();

            await retry.try(async () => {
              expect(await searchInput.getAttribute('value')).to.be('test');
            });
            await searchInput.clearValue();
          });
        });

        describe('Metrics Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetricsTab();
          });

          [
            { metric: 'cpu', chartsCount: 4 },
            { metric: 'memory', chartsCount: 2 },
            { metric: 'disk', chartsCount: 3 },
            { metric: 'network', chartsCount: 1 },
            { metric: 'log', chartsCount: 1 },
          ].forEach(({ metric, chartsCount }) => {
            it(`should show ${metric} charts group the in metrics section`, async () => {
              await pageObjects.assetDetails.hostMetricsChartsGroupExists(metric);
            });

            it(`should render ${chartsCount} ${metric} charts in the Metrics section`, async () => {
              const charts = await pageObjects.assetDetails.getMetricsTabHostCharts(metric);
              expect(charts.length).to.equal(chartsCount);
            });

            it(`should render quick access items for ${metric}`, async () => {
              await pageObjects.assetDetails.quickAccessItemExists(metric);
            });
          });
        });

        describe('Processes Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickProcessesTab();
            await pageObjects.header.waitUntilLoadingHasFinished();
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

          it('preserves search term between page reloads', async () => {
            const searchInput = await pageObjects.assetDetails.getProcessesSearchField();

            expect(await searchInput.getAttribute('value')).to.be('');

            await searchInput.type('test');
            await refreshPageWithDelay();

            await retry.try(async () => {
              expect(await searchInput.getAttribute('value')).to.be('test');
            });
            await searchInput.clearValue();
          });

          it('shows an error message when typing invalid term into the search input', async () => {
            const searchInput = await pageObjects.assetDetails.getProcessesSearchField();

            await pageObjects.assetDetails.processesSearchInputErrorMissing();
            await searchInput.type(',');
            await pageObjects.assetDetails.processesSearchInputErrorExists();
          });
        });

        describe('Logs Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickLogsTab();
          });

          it('should render logs tab', async () => {
            await pageObjects.assetDetails.logsExists();
          });

          it('preserves search term between page reloads', async () => {
            const searchInput = await pageObjects.assetDetails.getLogsSearchField();

            expect(await searchInput.getAttribute('value')).to.be('');

            await searchInput.type('test');
            await refreshPageWithDelay();

            await retry.try(async () => {
              expect(await searchInput.getAttribute('value')).to.be('test');
            });
            await searchInput.clearValue();
          });
        });

        describe('Osquery Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOsqueryTab();
          });

          it('should show a date picker', async () => {
            expect(await pageObjects.timePicker.timePickerExists()).to.be(false);
          });
        });

        describe('Profiling tab', () => {
          it('shows the Profiling tab if Profiling integration UI setting is enabled', async () => {
            await setInfrastructureProfilingIntegrationUiSetting(true);
            await pageObjects.assetDetails.profilingTabExists();
          });

          it('hides the Profiling tab if Profiling integration UI setting is disabled', async () => {
            await setInfrastructureProfilingIntegrationUiSetting(false);
            await pageObjects.assetDetails.profilingTabMissing();
          });
        });

        describe('Host with alerts and no processes', () => {
          before(async () => {
            await navigateToNodeDetails('demo-stack-mysql-01', 'demo-stack-mysql-01');
            await pageObjects.timePicker.setAbsoluteRange(
              START_HOST_ALERTS_DATE.format(DATE_PICKER_FORMAT),
              END_HOST_ALERTS_DATE.format(DATE_PICKER_FORMAT)
            );
          });

          it('should render alerts count for a host inside a flyout', async () => {
            await pageObjects.assetDetails.clickOverviewTab();

            await retry.tryForTime(30 * 1000, async () => {
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
            await pageObjects.assetDetails.clickProcessesTab();
            const processesTotalValue =
              await pageObjects.assetDetails.getProcessesTabContentTotalValue();
            const processValue = await processesTotalValue.getVisibleText();
            expect(processValue).to.eql('N/A');
          });
        });

        describe('#With Kubernetes section', () => {
          before(async () => {
            await navigateToNodeDetails('demo-stack-kubernetes-01', 'demo-stack-kubernetes-01');
            await pageObjects.header.waitUntilLoadingHasFinished();
          });

          describe('Overview Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickOverviewTab();

              await pageObjects.timePicker.setAbsoluteRange(
                START_HOST_KUBERNETES_SECTION_DATE.format(DATE_PICKER_FORMAT),
                END_HOST_KUBERNETES_SECTION_DATE.format(DATE_PICKER_FORMAT)
              );
            });

            [
              { metric: 'cpuUsage', value: '99.6%' },
              { metric: 'normalizedLoad1m', value: '1,300.3%' },
              { metric: 'memoryUsage', value: '42.2%' },
              { metric: 'diskUsage', value: '36.0%' },
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

            [
              { metric: 'cpu', chartsCount: 2 },
              { metric: 'memory', chartsCount: 1 },
              { metric: 'disk', chartsCount: 2 },
              { metric: 'network', chartsCount: 1 },
              { metric: 'kubernetes', chartsCount: 2 },
            ].forEach(({ metric, chartsCount }) => {
              it(`should render ${chartsCount} ${metric} chart`, async () => {
                await retry.try(async () => {
                  const charts = await (metric === 'kubernetes'
                    ? pageObjects.assetDetails.getOverviewTabKubernetesMetricCharts()
                    : pageObjects.assetDetails.getOverviewTabHostMetricCharts(metric));

                  expect(charts.length).to.equal(chartsCount);
                });
              });
            });
          });

          describe('Metrics Tab', () => {
            before(async () => {
              await pageObjects.assetDetails.clickMetricsTab();
            });

            [
              { metric: 'cpu', chartsCount: 4 },
              { metric: 'memory', chartsCount: 2 },
              { metric: 'disk', chartsCount: 3 },
              { metric: 'network', chartsCount: 1 },
              { metric: 'log', chartsCount: 1 },
              { metric: 'kubernetes', chartsCount: 4 },
            ].forEach(({ metric, chartsCount }) => {
              it(`should show ${metric} charts group`, async () => {
                await retry.try(async () => {
                  await pageObjects.assetDetails.hostMetricsChartsGroupExists(metric);
                });
              });

              it(`should render ${chartsCount} ${metric} chart(s)`, async () => {
                retry.try(async () => {
                  const charts = await (metric === 'kubernetes'
                    ? pageObjects.assetDetails.getMetricsTabKubernetesCharts()
                    : pageObjects.assetDetails.getMetricsTabHostCharts(metric));

                  expect(charts.length).to.equal(chartsCount);
                });
              });

              it(`should render quick access items for ${metric}`, async () => {
                await retry.try(async () => {
                  await pageObjects.assetDetails.quickAccessItemExists(metric);
                });
              });
            });
          });
        });
      });
    });
  });
};
