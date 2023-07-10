/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { parse } from 'url';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/common';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { WebElementWrapper } from '../../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, HOSTS_LINK_LOCAL_STORAGE_KEY, HOSTS_VIEW_PATH } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const START_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataStartDate);
const END_HOST_PROCESSES_DATE = moment.utc(DATES.metricsAndLogs.hosts.processesDataEndDate);
const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

const tableEntries = [
  {
    title: 'demo-stack-apache-01',
    cpuUsage: '1.2%',
    normalizedLoad: '0.5%',
    memoryUsage: '18.4%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '17.6%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    title: 'demo-stack-client-01',
    cpuUsage: '0.5%',
    normalizedLoad: '0.1%',
    memoryUsage: '13.8%',
    memoryFree: '3.3 GB',
    diskSpaceUsage: '16.9%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    title: 'demo-stack-haproxy-01',
    cpuUsage: '0.8%',
    normalizedLoad: '0%',
    memoryUsage: '16.5%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '16.3%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    title: 'demo-stack-mysql-01',
    cpuUsage: '0.9%',
    normalizedLoad: '0%',
    memoryUsage: '18.2%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '17.8%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    title: 'demo-stack-nginx-01',
    cpuUsage: '0.8%',
    normalizedLoad: '1.4%',
    memoryUsage: '18%',
    memoryFree: '3.2 GB',
    diskSpaceUsage: '17.5%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
  {
    title: 'demo-stack-redis-01',
    cpuUsage: '0.8%',
    normalizedLoad: '0%',
    memoryUsage: '15.9%',
    memoryFree: '3.3 GB',
    diskSpaceUsage: '16.3%',
    rx: '0 bit/s',
    tx: '0 bit/s',
  },
];

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const find = getService('find');
  const kibanaServer = getService('kibanaServer');
  const observability = getService('observability');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'common',
    'infraHome',
    'timePicker',
    'infraHostsView',
    'security',
    'settings',
    'header',
  ]);

  // Helpers
  const setHostViewEnabled = (value: boolean = true) =>
    kibanaServer.uiSettings.update({ [enableInfrastructureHostsView]: value });

  const loginWithReadOnlyUser = async () => {
    const roleCreation = await security.role.create('global_hosts_read_privileges_role', {
      elasticsearch: {
        indices: [{ names: ['metricbeat-*'], privileges: ['read', 'view_index_metadata'] }],
      },
      kibana: [
        {
          feature: {
            infrastructure: ['read'],
            advancedSettings: ['read'],
          },
          spaces: ['*'],
        },
      ],
    });

    const userCreation = security.user.create('global_hosts_read_privileges_user', {
      password: 'global_hosts_read_privileges_user-password',
      roles: ['global_hosts_read_privileges_role'],
      full_name: 'test user',
    });

    await Promise.all([roleCreation, userCreation]);

    await pageObjects.security.forceLogout();
    await pageObjects.security.login(
      'global_hosts_read_privileges_user',
      'global_hosts_read_privileges_user-password',
      {
        expectSpaceSelector: false,
      }
    );
  };

  const logoutAndDeleteReadOnlyUser = () =>
    Promise.all([
      pageObjects.security.forceLogout(),
      security.role.delete('global_hosts_read_privileges_role'),
      security.user.delete('global_hosts_read_privileges_user'),
    ]);

  const returnTo = async (path: string, timeout = 2000) =>
    retry.waitForWithTimeout('returned to hosts view', timeout, async () => {
      await browser.goBack();
      const currentUrl = await browser.getCurrentUrl();
      return !!currentUrl.match(path);
    });

  describe('Hosts View', function () {
    before(async () => {
      await Promise.all([
        esArchiver.load('x-pack/test/functional/es_archives/infra/alerts'),
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
        kibanaServer.savedObjects.cleanStandardList(),
      ]);
      await browser.setWindowSize(1600, 1200);
    });

    after(async () => {
      await Promise.all([
        esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts'),
        esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
        esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_hosts_processes'),
        browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY),
      ]);
    });

    it('should be accessible from the Inventory page', async () => {
      await pageObjects.common.navigateToApp('infraOps');

      await pageObjects.infraHome.clickDismissKubernetesTourButton();
      await pageObjects.infraHostsView.getBetaBadgeExists();
      await pageObjects.infraHostsView.clickTryHostViewBadge();

      const pageUrl = await browser.getCurrentUrl();

      expect(pageUrl).to.contain(HOSTS_VIEW_PATH);
    });

    describe('#Landing page', () => {
      beforeEach(async () => {
        await setHostViewEnabled(false);
      });

      afterEach(async () => {
        await setHostViewEnabled(true);
      });

      describe('User with read permission', () => {
        beforeEach(async () => {
          await loginWithReadOnlyUser();
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
        });

        afterEach(async () => {
          await logoutAndDeleteReadOnlyUser();
        });

        it('Should show hosts landing page with callout when the hosts view is disabled', async () => {
          await pageObjects.infraHostsView.getBetaBadgeExists();
          const landingPageDisabled =
            await pageObjects.infraHostsView.getHostsLandingPageDisabled();
          const learnMoreDocsUrl = await pageObjects.infraHostsView.getHostsLandingPageDocsLink();
          const parsedUrl = new URL(learnMoreDocsUrl);

          expect(parsedUrl.host).to.be('www.elastic.co');
          expect(parsedUrl.pathname).to.be('/guide/en/kibana/current/kibana-privileges.html');
          expect(landingPageDisabled).to.contain(
            'Your user role doesn’t have sufficient privileges to enable this feature'
          );
        });
      });

      describe('Admin user', () => {
        beforeEach(async () => {
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
        });

        it('as an admin, should see an enable button when the hosts view is disabled', async () => {
          const landingPageEnableButton =
            await pageObjects.infraHostsView.getHostsLandingPageEnableButton();
          const landingPageEnableButtonText = await landingPageEnableButton.getVisibleText();
          expect(landingPageEnableButtonText).to.eql('Enable hosts view');
        });

        it('as an admin, should be able to enable the hosts view feature', async () => {
          await pageObjects.infraHostsView.clickEnableHostViewButton();

          const titleElement = await find.byCssSelector('h1');
          const title = await titleElement.getVisibleText();

          expect(title).to.contain('Hosts');
        });
      });
    });

    describe('#Single host Flyout', () => {
      before(async () => {
        await setHostViewEnabled(true);
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.timePicker.setAbsoluteRange(
          START_HOST_PROCESSES_DATE.format(timepickerFormat),
          END_HOST_PROCESSES_DATE.format(timepickerFormat)
        );
      });

      beforeEach(async () => {
        await pageObjects.infraHostsView.clickTableOpenFlyoutButton();
      });

      afterEach(async () => {
        await retry.try(async () => {
          await pageObjects.infraHostsView.clickCloseFlyoutButton();
        });
      });

      describe('Overview Tab', () => {
        it('should render 4 metrics trend tiles', async () => {
          const hosts = await pageObjects.infraHostsView.getAllKPITiles();
          expect(hosts.length).to.equal(5);
        });

        [
          { metric: 'cpuUsage', value: '13.9%' },
          { metric: 'normalizedLoad1m', value: '18.8%' },
          { metric: 'memoryUsage', value: '94.9%' },
          { metric: 'diskSpaceUsage', value: 'N/A' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            await retry.try(async () => {
              const tileValue = await pageObjects.infraHostsView.getAssetDetailsKPITileValue(
                metric
              );
              expect(tileValue).to.eql(value);
            });
          });
        });
        it('should navigate to metadata tab', async () => {
          await pageObjects.infraHostsView.clickShowAllMetadataOverviewTab();
          await pageObjects.header.waitUntilLoadingHasFinished();
          await pageObjects.infraHostsView.metadataTableExist();
        });
      });

      describe('Metadata Tab', () => {
        it('should render metadata tab, pin/unpin row, add and remove filter', async () => {
          await pageObjects.infraHostsView.clickMetadataFlyoutTab();

          const metadataTab = await pageObjects.infraHostsView.getMetadataTabName();
          expect(metadataTab).to.contain('Metadata');
          await pageObjects.infraHostsView.metadataTableExist();

          // Add Pin
          await pageObjects.infraHostsView.clickAddMetadataPin();
          expect(await pageObjects.infraHostsView.getRemovePinExist()).to.be(true);

          // Persist pin after refresh
          await browser.refresh();
          await pageObjects.infraHome.waitForLoading();
          expect(await pageObjects.infraHostsView.getRemovePinExist()).to.be(true);

          // Remove Pin
          await pageObjects.infraHostsView.clickRemoveMetadataPin();
          expect(await pageObjects.infraHostsView.getRemovePinExist()).to.be(false);

          await pageObjects.infraHostsView.clickAddMetadataFilter();
          await pageObjects.header.waitUntilLoadingHasFinished();

          // Add Filter
          const addedFilter = await pageObjects.infraHostsView.getAppliedFilter();
          expect(addedFilter).to.contain('host.architecture: arm64');
          const removeFilterExists = await pageObjects.infraHostsView.getRemoveFilterExist();
          expect(removeFilterExists).to.be(true);

          // Remove filter
          await pageObjects.infraHostsView.clickRemoveMetadataFilter();
          await pageObjects.header.waitUntilLoadingHasFinished();
          const removeFilterShouldNotExist =
            await pageObjects.infraHostsView.getRemoveFilterExist();
          expect(removeFilterShouldNotExist).to.be(false);
        });
      });

      it('should render metadata tab, pin and unpin table row', async () => {
        const metadataTab = await pageObjects.infraHostsView.getMetadataTabName();
        expect(metadataTab).to.contain('Metadata');
      });

      describe('Processes Tab', () => {
        it('should render processes tab and with Total Value summary', async () => {
          await pageObjects.infraHostsView.clickProcessesFlyoutTab();
          const processesTotalValue =
            await pageObjects.infraHostsView.getProcessesTabContentTotalValue();
          const processValue = await processesTotalValue.getVisibleText();
          expect(processValue).to.eql('313');
        });

        it('should expand processes table row', async () => {
          await pageObjects.infraHostsView.clickProcessesFlyoutTab();
          await pageObjects.infraHostsView.getProcessesTable();
          await pageObjects.infraHostsView.getProcessesTableBody();
          await pageObjects.infraHostsView.clickProcessesTableExpandButton();
        });
      });

      describe('Logs Tab', () => {
        it('should render logs tab', async () => {
          await pageObjects.infraHostsView.clickLogsFlyoutTab();
          await testSubjects.existOrFail('infraAssetDetailsLogsTabContent');
        });
      });

      it('should navigate to Uptime after click', async () => {
        await pageObjects.infraHostsView.clickFlyoutUptimeLink();
        const url = parse(await browser.getCurrentUrl());

        const search = 'search=host.name: "Jennys-MBP.fritz.box" OR host.ip: "192.168.1.79"';
        const query = decodeURIComponent(url.query ?? '');

        expect(url.pathname).to.eql('/app/uptime/');
        expect(query).to.contain(search);

        await returnTo(HOSTS_VIEW_PATH);
      });

      it('should navigate to APM services after click', async () => {
        await pageObjects.infraHostsView.clickFlyoutApmServicesLink();
        const url = parse(await browser.getCurrentUrl());

        const query = decodeURIComponent(url.query ?? '');

        const kuery = 'kuery=host.hostname:"Jennys-MBP.fritz.box"';
        const rangeFrom = 'rangeFrom=2023-03-28T18:20:00.000Z';
        const rangeTo = 'rangeTo=2023-03-28T18:21:00.000Z';

        expect(url.pathname).to.eql('/app/apm/services');
        expect(query).to.contain(kuery);
        expect(query).to.contain(rangeFrom);
        expect(query).to.contain(rangeTo);

        await returnTo(HOSTS_VIEW_PATH);
      });

      describe('Processes Tab', () => {
        it('should render processes tab and with Total Value summary', async () => {
          await pageObjects.infraHostsView.clickProcessesFlyoutTab();
          const processesTotalValue =
            await pageObjects.infraHostsView.getProcessesTabContentTotalValue();
          const processValue = await processesTotalValue.getVisibleText();
          expect(processValue).to.eql('313');
        });

        it('should expand processes table row', async () => {
          await pageObjects.infraHostsView.clickProcessesFlyoutTab();
          await pageObjects.infraHostsView.getProcessesTable();
          await pageObjects.infraHostsView.getProcessesTableBody();
          await pageObjects.infraHostsView.clickProcessesTableExpandButton();
        });
      });
    });

    describe('#Page Content', () => {
      before(async () => {
        await setHostViewEnabled(true);
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );

        await retry.waitFor(
          'wait for table and KPI charts to load',
          async () =>
            (await pageObjects.infraHostsView.isHostTableLoading()) &&
            (await pageObjects.infraHostsView.isKPIChartsLoaded())
        );
      });

      it('should render the correct page title', async () => {
        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain('Hosts - Infrastructure - Observability - Elastic');
      });

      it('should render the title beta badge', async () => {
        await pageObjects.infraHostsView.getBetaBadgeExists();
      });

      describe('Hosts table', async () => {
        let hostRows: WebElementWrapper[] = [];

        before(async () => {
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
        });

        it('should render a table with 6 hosts', async () => {
          expect(hostRows.length).to.equal(6);
        });

        it('should render the computed metrics for each host entry', async () => {
          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[position]));
          });
        });

        it('should select and filter hosts inside the table', async () => {
          const selectHostsButtonExistsOnLoad =
            await pageObjects.infraHostsView.selectedHostsButtonExist();
          expect(selectHostsButtonExistsOnLoad).to.be(false);

          await pageObjects.infraHostsView.clickHostCheckbox('demo-stack-client-01', '-');
          await pageObjects.infraHostsView.clickHostCheckbox('demo-stack-apache-01', '-');

          const selectHostsButtonExistsOnSelection =
            await pageObjects.infraHostsView.selectedHostsButtonExist();
          expect(selectHostsButtonExistsOnSelection).to.be(true);

          await pageObjects.infraHostsView.clickSelectedHostsButton();
          await pageObjects.infraHostsView.clickSelectedHostsAddFilterButton();

          await pageObjects.header.waitUntilLoadingHasFinished();
          const hostRowsAfterFilter = await pageObjects.infraHostsView.getHostsTableData();
          expect(hostRowsAfterFilter.length).to.equal(2);

          const deleteFilterButton = await find.byCssSelector(
            `[title="Delete host.name: demo-stack-client-01 OR host.name: demo-stack-apache-01"]`
          );
          await deleteFilterButton.click();
          await pageObjects.header.waitUntilLoadingHasFinished();
          const hostRowsAfterRemovingFilter = await pageObjects.infraHostsView.getHostsTableData();
          expect(hostRowsAfterRemovingFilter.length).to.equal(6);
        });
      });

      it('should render "N/A" when processes summary is not available in flyout', async () => {
        await pageObjects.infraHostsView.clickTableOpenFlyoutButton();
        await pageObjects.infraHostsView.clickProcessesFlyoutTab();
        const processesTotalValue =
          await pageObjects.infraHostsView.getProcessesTabContentTotalValue();
        const processValue = await processesTotalValue.getVisibleText();
        expect(processValue).to.eql('N/A');
        await pageObjects.infraHostsView.clickCloseFlyoutButton();
      });

      describe('KPI tiles', () => {
        it('should render 5 metrics trend tiles', async () => {
          const hosts = await pageObjects.infraHostsView.getAllKPITiles();
          expect(hosts.length).to.equal(5);
        });

        [
          { metric: 'hostsCount', value: '6' },
          { metric: 'cpuUsage', value: '0.8%' },
          { metric: 'normalizedLoad1m', value: '0.3%' },
          { metric: 'memoryUsage', value: '16.8%' },
          { metric: 'diskSpaceUsage', value: '17.1%' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            await retry.try(async () => {
              const tileValue = await pageObjects.infraHostsView.getKPITileValue(metric);
              expect(tileValue).to.eql(value);
            });
          });
        });
      });

      describe('Metrics Tab', () => {
        before(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.visitMetricsTab();
        });

        after(async () => {
          await browser.scrollTop();
        });

        it('should load 12 lens metric charts', async () => {
          const metricCharts = await pageObjects.infraHostsView.getAllMetricsCharts();
          expect(metricCharts.length).to.equal(12);
        });

        it('should have an option to open the chart in lens', async () => {
          await pageObjects.infraHostsView.clickAndValidateMetriChartActionOptions();
        });
      });

      describe('Logs Tab', () => {
        before(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.visitLogsTab();
        });

        after(async () => {
          await browser.scrollTop();
        });

        it('should load the Logs tab section when clicking on it', async () => {
          await testSubjects.existOrFail('hostsView-logs');
        });

        it('should load the Logs tab with the right columns', async () => {
          await retry.try(async () => {
            const columnLabels = await pageObjects.infraHostsView.getLogsTableColumnHeaders();

            expect(columnLabels).to.eql(['Timestamp', 'host.name', 'Message']);
          });
        });
      });

      describe('Alerts Tab', () => {
        const ACTIVE_ALERTS = 6;
        const RECOVERED_ALERTS = 4;
        const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
        const COLUMNS = 6;

        before(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.visitAlertTab();
        });

        after(async () => {
          await browser.scrollTop();
        });

        it('should correctly load the Alerts tab section when clicking on it', async () => {
          testSubjects.existOrFail('hostsView-alerts');
        });

        it('should correctly render a badge with the active alerts count', async () => {
          const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

          expect(alertsCount).to.be('6');
        });

        describe('#FilterButtonGroup', () => {
          it('can be filtered to only show "all" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter();
            await retry.try(async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ALL_ALERTS);
            });
          });

          it('can be filtered to only show "active" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_ACTIVE);
            await retry.try(async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ACTIVE_ALERTS);
            });
          });

          it('can be filtered to only show "recovered" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter(ALERT_STATUS_RECOVERED);
            await retry.try(async () => {
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
            await retry.try(async () => {
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
          await browser.scrollTop();
          await pageObjects.infraHostsView.submitQuery(query);
          await retry.waitFor(
            'wait for table and KPI charts to load',
            async () =>
              (await pageObjects.infraHostsView.isHostTableLoading()) &&
              (await pageObjects.infraHostsView.isKPIChartsLoaded())
          );
        });

        after(async () => {
          await browser.scrollTop();
          await pageObjects.infraHostsView.submitQuery('');
        });

        it('should filter the table content on a search submit', async () => {
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();

          expect(hostRows.length).to.equal(3);

          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(filtererEntries[position]));
          });
        });

        it('should update the KPIs content on a search submit', async () => {
          await Promise.all(
            [
              { metric: 'hostsCount', value: '3' },
              { metric: 'cpuUsage', value: '0.8%' },
              { metric: 'normalizedLoad1m', value: '0.2%' },
              { metric: 'memoryUsage', value: '16.3%' },
              { metric: 'diskSpaceUsage', value: '16.9%' },
            ].map(async ({ metric, value }) => {
              await retry.try(async () => {
                const tileValue = await pageObjects.infraHostsView.getKPITileValue(metric);
                expect(tileValue).to.eql(value);
              });
            })
          );
        });

        it('should update the alerts count on a search submit', async () => {
          const alertsCount = await pageObjects.infraHostsView.getAlertsCount();

          expect(alertsCount).to.be('2');
        });

        it('should update the alerts table content on a search submit', async () => {
          const ACTIVE_ALERTS = 2;
          const RECOVERED_ALERTS = 2;
          const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
          const COLUMNS = 6;

          await pageObjects.infraHostsView.visitAlertTab();

          await pageObjects.infraHostsView.setAlertStatusFilter();
          await retry.try(async () => {
            const cells = await observability.alerts.common.getTableCells();
            expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
          });
        });

        it('should show an error message when an invalid KQL is submitted', async () => {
          await pageObjects.infraHostsView.submitQuery('cloud.provider="gcp" A');
          await testSubjects.existOrFail('hostsViewErrorCallout');
        });
      });

      describe('Pagination and Sorting', () => {
        before(async () => {
          await browser.scrollTop();
        });

        after(async () => {
          await browser.scrollTop();
        });

        beforeEach(async () => {
          await retry.try(async () => {
            await pageObjects.infraHostsView.changePageSize(5);
          });
        });

        it('should show 5 rows on the first page', async () => {
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();
          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[position]));
          });
        });

        it('should paginate to the last page', async () => {
          await pageObjects.infraHostsView.paginateTo(2);
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();
          hostRows.forEach((row) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[5]));
          });
        });

        it('should show all hosts on the same page', async () => {
          await pageObjects.infraHostsView.changePageSize(10);
          const hostRows = await pageObjects.infraHostsView.getHostsTableData();
          hostRows.forEach((row, position) => {
            pageObjects.infraHostsView
              .getHostsRowData(row)
              .then((hostRowData) => expect(hostRowData).to.eql(tableEntries[position]));
          });
        });

        it('should sort by a numeric field asc', async () => {
          await pageObjects.infraHostsView.sortByCpuUsage();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[1]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[0]);
        });

        it('should sort by a numeric field desc', async () => {
          await pageObjects.infraHostsView.sortByCpuUsage();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[0]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[1]);
        });

        it('should sort by text field asc', async () => {
          await pageObjects.infraHostsView.sortByTitle();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[0]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[5]);
        });

        it('should sort by text field desc', async () => {
          await pageObjects.infraHostsView.sortByTitle();
          let hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataFirtPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataFirtPage).to.eql(tableEntries[5]);

          await pageObjects.infraHostsView.paginateTo(2);
          hostRows = await pageObjects.infraHostsView.getHostsTableData();
          const hostDataLastPage = await pageObjects.infraHostsView.getHostsRowData(hostRows[0]);
          expect(hostDataLastPage).to.eql(tableEntries[0]);
        });
      });
    });
  });
};
