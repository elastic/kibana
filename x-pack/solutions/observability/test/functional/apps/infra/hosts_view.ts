/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, HOSTS_VIEW_PATH, DATE_PICKER_FORMAT } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);

const tableEntries = [
  {
    alertsCount: 2,
    title: 'demo-stack-apache-01',
    cpuUsage: '0%',
    normalizedLoad: '0.5%',
    memoryUsage: '18.4%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '35.1%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 2,
    title: 'demo-stack-mysql-01',
    cpuUsage: '0%',
    normalizedLoad: '0%',
    memoryUsage: '18.2%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '35.7%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 2,
    title: 'demo-stack-redis-01',
    cpuUsage: '0%',
    normalizedLoad: '0%',
    memoryUsage: '15.9%',
    memoryFree: '3.3 GB',
    diskSpaceUsage: '32.5%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 0,
    title: 'demo-stack-client-01',
    cpuUsage: '0%',
    normalizedLoad: '0.1%',
    memoryUsage: '13.8%',
    memoryFree: '3.3 GB',
    diskSpaceUsage: '33.8%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 0,
    title: 'demo-stack-haproxy-01',
    cpuUsage: '0%',
    normalizedLoad: '0%',
    memoryUsage: '16.5%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '32.6%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    alertsCount: 0,
    title: 'demo-stack-nginx-01',
    cpuUsage: '0%',
    normalizedLoad: '1.4%',
    memoryUsage: '18%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '35%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
];

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const observability = getService('observability');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');

  const pageObjects = getPageObjects([
    'assetDetails',
    'common',
    'timePicker',
    'infraHostsView',
    'header',
  ]);

  const waitForPageToLoad = async () =>
    await retry.waitFor(
      'wait for table and KPI charts to load',
      async () =>
        (await pageObjects.infraHostsView.isHostTableLoaded()) &&
        (await pageObjects.infraHostsView.isKPIChartsLoaded())
    );

  describe('Hosts View', function () {
    describe('#Page Content with alerts', () => {
      before(async () => {
        return Promise.all([
          esArchiver.load('x-pack/solutions/observability/test/fixtures/es_archives/infra/alerts'),
          esArchiver.load(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/metrics_and_logs'
          ),
        ]);
      });

      after(async () => {
        return Promise.all([
          esArchiver.unload(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/alerts'
          ),
          esArchiver.unload(
            'x-pack/solutions/observability/test/fixtures/es_archives/infra/metrics_and_logs'
          ),
        ]);
      });

      describe('Alerts Tab', () => {
        const ACTIVE_ALERTS = 6;
        const RECOVERED_ALERTS = 4;
        const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
        const COLUMNS = 12;

        before(async () => {
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
          await pageObjects.timePicker.setAbsoluteRange(
            START_DATE.format(DATE_PICKER_FORMAT),
            END_DATE.format(DATE_PICKER_FORMAT)
          );

          await waitForPageToLoad();
          await browser.scrollTop();
          await pageObjects.infraHostsView.visitAlertTab();
        });

        after(async () => {
          await browser.scrollTop();
        });

        it('should correctly load the Alerts tab section when clicking on it', async () => {
          await testSubjects.existOrFail('hostsView-alerts');
        });

        it('should correctly render a badge with the active alerts count', async () => {
          const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

          expect(alertsCount).to.be('6');
        });

        describe('#FilterButtonGroup', () => {
          it('can be filtered to only show "all" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter();
            await retry.tryForTime(5000, async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ALL_ALERTS);
            });
          });

          it('can be filtered to only show "active" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_ACTIVE);
            await retry.tryForTime(5000, async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ACTIVE_ALERTS);
            });
          });

          it('can be filtered to only show "recovered" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_RECOVERED);
            await retry.tryForTime(5000, async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(RECOVERED_ALERTS);
            });
          });
        });

        describe('#AlertsTable', () => {
          it('should correctly render', async () => {
            await observability.alerts.common.getTableOrFail();
          });

          it('should renders the correct number of cells', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter();
            await retry.tryForTime(5000, async () => {
              const cells = await observability.alerts.common.getTableCells();
              expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
            });
          });
        });
      });

      describe('Search Query', () => {
        const filtererEntries = tableEntries.slice(0, 3);

        const query = filtererEntries.map((entry) => `host.name :"${entry.title}"`).join(' or ');

        before(async () => {
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
          await pageObjects.timePicker.setAbsoluteRange(
            START_DATE.format(DATE_PICKER_FORMAT),
            END_DATE.format(DATE_PICKER_FORMAT)
          );

          await waitForPageToLoad();
          await browser.scrollTop();
          await pageObjects.infraHostsView.submitQuery(query);
          await waitForPageToLoad();
        });

        after(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.submitQuery('');
        });

        it('should filter the table content on a search submit', async () => {
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();

          expect(hostRows.length).to.equal(3);

          for (let i = 0; i < hostRows.length; i++) {
            const hostRowData = await pageObjects.infraHostsView.getHostsRowDataWithAlerts(
              hostRows[i]
            );
            expect(hostRowData).to.eql(filtererEntries[i]);
          }
        });

        it('should update the KPIs content on a search submit', async () => {
          await Promise.all(
            [
              { metric: 'hostsCount', value: '3' },
              { metric: 'cpuUsage', value: 'N/A' },
              { metric: 'normalizedLoad1m', value: '0.2%' },
              { metric: 'memoryUsage', value: '17.5%' },
              { metric: 'diskUsage', value: '35.7%' },
            ].map(async ({ metric, value }) => {
              await retry.tryForTime(5000, async () => {
                const tileValue =
                  metric === 'hostsCount'
                    ? await pageObjects.infraHostsView.getKPITileValue(metric)
                    : await pageObjects.assetDetails.getAssetDetailsKPITileValue(metric);
                expect(tileValue).to.eql(value);
              });
            })
          );
        });

        it('should update the alerts count on a search submit', async () => {
          const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

          expect(alertsCount).to.be('6');
        });

        it('should update the alerts table content on a search submit', async () => {
          const ACTIVE_ALERTS = 6;
          const RECOVERED_ALERTS = 4;
          const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
          const COLUMNS = 12;

          await pageObjects.infraHostsView.visitAlertTab();

          await pageObjects.infraHostsView.setAlertStatusFilter();
          await retry.tryForTime(5000, async () => {
            const cells = await observability.alerts.common.getTableCells();
            expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
          });
        });

        it('should show an error message when an invalid KQL is submitted', async () => {
          await pageObjects.infraHostsView.submitQuery('cloud.provider="gcp" A');
          await testSubjects.existOrFail('hostsViewErrorCallout');
        });

        it('should show no data message in the table content', async () => {
          await pageObjects.infraHostsView.submitQuery('host.name : "foo"');

          await waitForPageToLoad();

          await retry.tryForTime(5000, async () => {
            await testSubjects.exists('hostsViewTableNoData');
          });
        });
      });
    });
  });
};
