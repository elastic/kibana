/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import { InfraSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { enableInfrastructureProfilingIntegration } from '@kbn/observability-plugin/common';
import {
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  DATES,
  NODE_DETAILS_PATH,
  DATE_PICKER_FORMAT,
  DATE_WITH_DOCKER_DATA_FROM,
  DATE_WITH_DOCKER_DATA_TO,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
} from './constants';
import { getInfraSynthtraceEsClient } from '../../../common/utils/synthtrace/infra_es_client';
import {
  generateDockerContainersData,
  generateHostData,
  generateHostsWithK8sNodeData,
} from './helpers';

const START_HOST_ALERTS_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_HOST_ALERTS_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const START_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataStartDate);
const END_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataEndDate);
const START_HOST_DATE = moment.utc(DATE_WITH_HOSTS_DATA_FROM);
const END_HOST_DATE = moment.utc(DATE_WITH_HOSTS_DATA_TO);
const START_CONTAINER_DATE = moment.utc(DATE_WITH_DOCKER_DATA_FROM);
const END_CONTAINER_DATE = moment.utc(DATE_WITH_DOCKER_DATA_TO);

const HOSTS = [
  {
    hostName: 'host-1',
    cpuValue: 0.5,
  },
  {
    hostName: 'host-2',
    cpuValue: 0.7,
  },
  {
    hostName: 'host-3',
    cpuValue: 0.9,
  },
  {
    hostName: 'host-4',
    cpuValue: 0.3,
  },
  {
    hostName: 'host-5',
    cpuValue: 0.1,
  },
];

const HOSTS_WITHOUT_DATA = [
  {
    hostName: 'host-7',
  },
];
interface QueryParams {
  name?: string;
  alertMetric?: string;
}

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const observability = getService('observability');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'assetDetails',
    'common',
    'infraHome',
    'header',
    'timePicker',
  ]);

  const waitForChartsToLoad = async () =>
    await retry.waitFor(
      'wait for table and Metric charts to load',
      async () => await pageObjects.assetDetails.isMetricChartsLoaded()
    );

  const getNodeDetailsUrl = (queryParams?: QueryParams) => {
    return rison.encodeUnknown(
      Object.entries(queryParams ?? {}).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {})
    );
  };

  const navigateToNodeDetails = async (
    assetId: string,
    assetType: string,
    queryParams?: QueryParams
  ) => {
    await pageObjects.common.navigateToUrlWithBrowserHistory(
      'infraOps',
      `/${NODE_DETAILS_PATH}/${assetType}/${assetId}`,
      `assetDetails=${getNodeDetailsUrl(queryParams)}`,
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
    let synthEsClient: InfraSynthtraceEsClient;
    before(async () => {
      synthEsClient = await getInfraSynthtraceEsClient(esClient);
      await kibanaServer.savedObjects.cleanStandardList();
      await browser.setWindowSize(1600, 1200);

      return synthEsClient.clean();
    });

    after(() => synthEsClient.clean());

    describe('#Asset Type: host', () => {
      before(async () => {
        await synthEsClient.index(
          generateHostData({
            from: DATE_WITH_HOSTS_DATA_FROM,
            to: DATE_WITH_HOSTS_DATA_TO,
            hosts: HOSTS,
          })
        );

        await navigateToNodeDetails('host-1', 'host', {
          name: 'host-1',
        });

        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      after(() => synthEsClient.clean());

      it('preserves selected tab between page reloads', async () => {
        await testSubjects.missingOrFail('infraAssetDetailsMetadataTable');
        await pageObjects.assetDetails.clickMetadataTab();
        await pageObjects.assetDetails.metadataTableExists();

        await refreshPageWithDelay();

        await pageObjects.assetDetails.metadataTableExists();
      });

      describe('#Date picker: host', () => {
        before(async () => {
          await pageObjects.assetDetails.clickOverviewTab();

          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_DATE.format(DATE_PICKER_FORMAT)
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
            expect(datePickerValue.start).to.equal(START_HOST_DATE.format(DATE_PICKER_FORMAT));
            expect(datePickerValue.end).to.equal(END_HOST_DATE.format(DATE_PICKER_FORMAT));
          });
        });

        it('preserves selected date range between page reloads', async () => {
          const start = moment.utc(START_HOST_DATE).format(DATE_PICKER_FORMAT);
          const end = moment.utc(END_HOST_DATE).format(DATE_PICKER_FORMAT);

          await pageObjects.timePicker.setAbsoluteRange(start, end);
          await refreshPageWithDelay();

          const datePickerValue = await pageObjects.timePicker.getTimeConfig();

          expect(datePickerValue.start).to.equal(start);
          expect(datePickerValue.end).to.equal(end);
        });
      });

      describe('Overview Tab', () => {
        before(async () => {
          await pageObjects.assetDetails.clickOverviewTab();
          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_DATE.format(DATE_PICKER_FORMAT)
          );
        });

        [
          { metric: 'cpuUsage', value: '50.0%' },
          { metric: 'normalizedLoad1m', value: '18.8%' },
          { metric: 'memoryUsage', value: '35.0%' },
          { metric: 'diskUsage', value: '1,223.0%' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            await retry.tryForTime(3 * 1000, async () => {
              const tileValue = await pageObjects.assetDetails.getAssetDetailsKPITileValue(metric);
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
          it(`should render ${chartsCount} ${metric} chart(s) in the Metrics section`, async () => {
            await waitForChartsToLoad();
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
            await esArchiver.load('x-pack/test/functional/es_archives/infra/alerts');
            await navigateToNodeDetails('demo-stack-apache-01', 'host', {
              name: 'demo-stack-apache-01',
            });
            await pageObjects.header.waitUntilLoadingHasFinished();

            await pageObjects.timePicker.setAbsoluteRange(
              START_HOST_ALERTS_DATE.format(DATE_PICKER_FORMAT),
              END_HOST_ALERTS_DATE.format(DATE_PICKER_FORMAT)
            );

            await pageObjects.assetDetails.clickOverviewTab();
          });

          after(async () => {
            await navigateToNodeDetails('host-1', 'host', {
              name: 'host-1',
            });
            await pageObjects.header.waitUntilLoadingHasFinished();
            await esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts');
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
            await retry.tryForTime(5000, async () => {
              const cells = await observability.alerts.common.getTableCells();
              expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
            });
          });

          it('can be filtered to only show "all" alerts using the filter button', async () => {
            await pageObjects.assetDetails.setAlertStatusFilter();
            await retry.tryForTime(5000, async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ALL_ALERTS);
            });
          });

          it('can be filtered to only show "active" alerts using the filter button', async () => {
            await pageObjects.assetDetails.setAlertStatusFilter(ALERT_STATUS_ACTIVE);
            await retry.tryForTime(5000, async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ACTIVE_ALERTS);
            });
            const pageUrl = await browser.getCurrentUrl();
            expect(pageUrl).to.contain('alertStatus%3Aactive');
          });

          it('can be filtered to only show "recovered" alerts using the filter button', async () => {
            await pageObjects.assetDetails.setAlertStatusFilter(ALERT_STATUS_RECOVERED);
            await retry.tryForTime(5000, async () => {
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
            expect(totalAlertsCount.trim()).to.equal('4');
          });

          it('should render "N/A" when processes summary is not available in flyout', async () => {
            await pageObjects.assetDetails.clickProcessesTab();
            const processesTotalValue =
              await pageObjects.assetDetails.getProcessesTabContentTotalValue();
            await retry.tryForTime(5000, async () => {
              expect(await processesTotalValue.getVisibleText()).to.eql('N/A');
            });
          });
        });
      });

      describe('Metadata Tab', () => {
        before(async () => {
          await pageObjects.assetDetails.clickMetadataTab();
          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_DATE.format(DATE_PICKER_FORMAT)
          );
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
          await retry.tryForTime(5000, async () => {
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

          await retry.tryForTime(5000, async () => {
            expect(await searchInput.getAttribute('value')).to.be('test');
          });
          await searchInput.clearValue();
        });
      });

      describe('Metrics Tab', () => {
        before(async () => {
          await pageObjects.assetDetails.clickMetricsTab();
          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_DATE.format(DATE_PICKER_FORMAT)
          );

          await waitForChartsToLoad();
        });

        after(async () => {
          await browser.scrollTop();
        });

        [
          { metric: 'cpu', chartsCount: 4 },
          { metric: 'memory', chartsCount: 2 },
          { metric: 'disk', chartsCount: 3 },
          { metric: 'network', chartsCount: 1 },
          { metric: 'log', chartsCount: 1 },
        ].forEach(({ metric, chartsCount }) => {
          it(`should render ${chartsCount} ${metric} chart(s)`, async () => {
            const charts = await pageObjects.assetDetails.getMetricsTabHostCharts(metric);
            expect(charts.length).to.equal(chartsCount);
          });

          it(`should render a quick access for ${metric} in the side panel`, async () => {
            await pageObjects.assetDetails.quickAccessItemExists(metric);
          });
        });
      });
      // FLAKY: https://github.com/elastic/kibana/issues/192891
      describe.skip('Processes Tab', () => {
        before(async () => {
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_hosts_processes');
          await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
          await navigateToNodeDetails('Jennys-MBP.fritz.box', 'host', {
            name: 'Jennys-MBP.fritz.box',
          });
          await pageObjects.assetDetails.clickProcessesTab();
          await pageObjects.header.waitUntilLoadingHasFinished();
          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_PROCESSES_DATE.format(DATE_PICKER_FORMAT)
          );
        });
        after(async () => {
          await esArchiver.unload(
            'x-pack/test/functional/es_archives/infra/metrics_hosts_processes'
          );
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
          await navigateToNodeDetails('host-1', 'host', { name: 'host-1' });
        });

        it('should render processes tab and with Total Value summary', async () => {
          await pageObjects.header.waitUntilLoadingHasFinished();
          const processesTotalValue =
            await pageObjects.assetDetails.getProcessesTabContentTotalValue();
          await retry.tryForTime(5000, async () => {
            expect(await processesTotalValue.getVisibleText()).to.eql('313');
          });
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

          await retry.tryForTime(5000, async () => {
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

      // FLAKY: https://github.com/elastic/kibana/issues/203656
      describe.skip('Logs Tab', () => {
        before(async () => {
          await pageObjects.assetDetails.clickLogsTab();
          await pageObjects.timePicker.setAbsoluteRange(
            START_HOST_DATE.format(DATE_PICKER_FORMAT),
            END_HOST_DATE.format(DATE_PICKER_FORMAT)
          );
        });

        it('should render logs tab content', async () => {
          await pageObjects.assetDetails.logsExists();
        });

        it('preserves search term between page reloads', async () => {
          const searchInput = await pageObjects.assetDetails.getLogsSearchField();

          expect(await searchInput.getAttribute('value')).to.be('');

          await searchInput.type('test');
          await refreshPageWithDelay();

          await retry.tryForTime(5000, async () => {
            expect(await searchInput.getAttribute('value')).to.be('test');
          });
          await searchInput.clearValue();
        });
      });

      describe('Osquery Tab', () => {
        before(async () => {
          await browser.scrollTop();
          await pageObjects.assetDetails.clickOsqueryTab();
        });

        it('should not show a date picker', async () => {
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

      describe('Callouts', () => {
        describe('Legacy alert metric callout', () => {
          [{ metric: 'cpu' }, { metric: 'rx' }, { metric: 'tx' }].forEach(({ metric }) => {
            it(`Should show for: ${metric}`, async () => {
              await navigateToNodeDetails('host-1', 'host', {
                name: 'host-1',
                alertMetric: metric,
              });
              await pageObjects.header.waitUntilLoadingHasFinished();

              await retry.tryForTime(5000, async () => {
                expect(await pageObjects.assetDetails.legacyMetricAlertCalloutExists()).to.be(true);
              });
            });
          });

          [{ metric: 'cpuV2' }, { metric: 'rxV2' }, { metric: 'txV2' }].forEach(({ metric }) => {
            it(`Should not show for: ${metric}`, async () => {
              await navigateToNodeDetails('host-1', 'host', {
                name: 'host-1',
                alertMetric: metric,
              });

              await pageObjects.header.waitUntilLoadingHasFinished();

              await retry.tryForTime(5000, async () => {
                expect(await pageObjects.assetDetails.legacyMetricAlertCalloutExists()).to.be(
                  false
                );
              });
            });
          });
        });
      });
    });

    describe('#Asset Type: host without metrics', () => {
      before(async () => {
        await synthEsClient.index(
          generateHostData({
            from: DATE_WITH_HOSTS_DATA_FROM,
            to: DATE_WITH_HOSTS_DATA_TO,
            hosts: HOSTS_WITHOUT_DATA,
          })
        );

        await navigateToNodeDetails('host-1', 'host', {
          name: 'host-1',
        });

        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      after(() => synthEsClient.clean());

      describe('Overview Tab', () => {
        before(async () => {
          await pageObjects.assetDetails.clickOverviewTab();
        });

        [
          { metric: 'cpuUsage' },
          { metric: 'normalizedLoad1m' },
          { metric: 'memoryUsage' },
          { metric: 'diskUsage' },
        ].forEach(({ metric }) => {
          it(`${metric} tile should not be shown`, async () => {
            await pageObjects.assetDetails.assetDetailsKPITileMissing(metric);
          });
        });

        it('should show add metrics callout', async () => {
          await pageObjects.assetDetails.addMetricsCalloutExists();
        });
      });

      describe('Processes Tab', () => {
        before(async () => {
          await pageObjects.assetDetails.clickProcessesTab();
        });

        it('should show add metrics callout', async () => {
          await pageObjects.assetDetails.addMetricsCalloutExists();
        });
      });
    });

    describe('#Asset type: host with kubernetes section', () => {
      before(async () => {
        await synthEsClient.index(
          generateHostsWithK8sNodeData({
            from: DATE_WITH_HOSTS_DATA_FROM,
            to: DATE_WITH_HOSTS_DATA_TO,
          })
        );
        await navigateToNodeDetails('demo-stack-kubernetes-01', 'host', {
          name: 'demo-stack-kubernetes-01',
        });
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.timePicker.setAbsoluteRange(
          START_HOST_DATE.format(DATE_PICKER_FORMAT),
          END_HOST_DATE.format(DATE_PICKER_FORMAT)
        );
      });

      after(() => synthEsClient.clean());

      describe('Overview Tab', () => {
        before(async () => {
          await pageObjects.assetDetails.clickOverviewTab();
        });

        [
          { metric: 'cpuUsage', value: '50.0%' },
          { metric: 'normalizedLoad1m', value: '18.8%' },
          { metric: 'memoryUsage', value: '35.0%' },
          { metric: 'diskUsage', value: '1,223.0%' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            await retry.tryForTime(3 * 1000, async () => {
              const tileValue = await pageObjects.assetDetails.getAssetDetailsKPITileValue(metric);
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
            await retry.tryForTime(5000, async () => {
              await waitForChartsToLoad();
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
          it(`should render ${chartsCount} ${metric} chart(s)`, async () => {
            await retry.tryForTime(5000, async () => {
              const charts = await (metric === 'kubernetes'
                ? pageObjects.assetDetails.getMetricsTabKubernetesCharts()
                : pageObjects.assetDetails.getMetricsTabHostCharts(metric));

              expect(charts.length).to.equal(chartsCount);
            });
          });

          it(`should render a quick access for ${metric} in the side panel`, async () => {
            await retry.tryForTime(5000, async () => {
              await pageObjects.assetDetails.quickAccessItemExists(metric);
            });
          });
        });
      });
    });

    describe('#Asset Type: container', () => {
      before(async () => {
        await synthEsClient.index(
          generateDockerContainersData({
            from: DATE_WITH_DOCKER_DATA_FROM,
            to: DATE_WITH_DOCKER_DATA_TO,
            count: 1,
          })
        );
        await navigateToNodeDetails('container-id-0', 'container', { name: 'container-id-0' });
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.timePicker.setAbsoluteRange(
          START_CONTAINER_DATE.format(DATE_PICKER_FORMAT),
          END_CONTAINER_DATE.format(DATE_PICKER_FORMAT)
        );
      });

      after(() => synthEsClient.clean());

      describe('when navigating to container asset view', () => {
        before(async () => {
          await navigateToNodeDetails('container-id-0', 'container', { name: 'container-id-0' });
          await pageObjects.header.waitUntilLoadingHasFinished();
          await pageObjects.timePicker.setAbsoluteRange(
            START_CONTAINER_DATE.format(DATE_PICKER_FORMAT),
            END_CONTAINER_DATE.format(DATE_PICKER_FORMAT)
          );
        });
        it('should show asset container details page', async () => {
          await pageObjects.assetDetails.getOverviewTab();
        });

        [
          { metric: 'cpuUsage', value: '25.0%' },
          { metric: 'memoryUsage', value: '20.0%' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            await retry.tryForTime(3 * 1000, async () => {
              const tileValue = await pageObjects.assetDetails.getAssetDetailsKPITileValue(metric);
              expect(tileValue).to.eql(value);
            });
          });
        });

        [
          { metric: 'cpu', chartsCount: 1 },
          { metric: 'memory', chartsCount: 1 },
          { metric: 'disk', chartsCount: 1 },
          { metric: 'network', chartsCount: 1 },
        ].forEach(({ metric, chartsCount }) => {
          it(`should render ${chartsCount} ${metric} chart(s) in the Metrics section`, async () => {
            const charts = await pageObjects.assetDetails.getOverviewTabDockerMetricCharts(metric);
            expect(charts.length).to.equal(chartsCount);
          });
        });

        it('should show / hide alerts section with no alerts and show / hide closed section content', async () => {
          await pageObjects.assetDetails.alertsSectionCollapsibleExist();
          // Collapsed by default
          await pageObjects.assetDetails.alertsSectionClosedContentNoAlertsExist();
          // Expand
          await pageObjects.assetDetails.alertsSectionCollapsibleClick();
          await pageObjects.assetDetails.alertsSectionClosedContentNoAlertsMissing();
          // Check if buttons exist
          await pageObjects.assetDetails.overviewLinkToAlertsExist();
          await pageObjects.assetDetails.overviewOpenAlertsFlyoutExist();
        });

        describe('Metadata Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetadataTab();
          });

          it('should show metadata table', async () => {
            await pageObjects.assetDetails.metadataTableExists();
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

            await retry.tryForTime(5000, async () => {
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
            { metric: 'cpu', chartsCount: 1 },
            { metric: 'memory', chartsCount: 1 },
            { metric: 'disk', chartsCount: 1 },
            { metric: 'network', chartsCount: 1 },
          ].forEach(({ metric, chartsCount }) => {
            it(`should render ${chartsCount} ${metric} chart(s)`, async () => {
              await waitForChartsToLoad();
              const charts = await pageObjects.assetDetails.getMetricsTabDockerCharts(metric);
              expect(charts.length).to.equal(chartsCount);
            });

            it(`should render a quick access for ${metric} in the side panel`, async () => {
              await pageObjects.assetDetails.quickAccessItemExists(metric);
            });
          });
        });
      });
    });
  });
};
