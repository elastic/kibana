/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/common';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, HOSTS_LINK_LOCAL_STORAGE_KEY, HOSTS_VIEW_PATH } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const find = getService('find');
  const security = getService('security');
  const pageObjects = getPageObjects([
    'common',
    'infraHome',
    'timePicker',
    'infraHostsView',
    'security',
    'settings',
  ]);

  // Helpers
  const setHostViewEnabled = (value: boolean = true) =>
    kibanaServer.uiSettings.update({ [enableInfrastructureHostsView]: value });

  const loginWithReadOnlyUser = async () => {
    const roleCreation = security.role.create('global_hosts_read_privileges_role', {
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

    const logout = pageObjects.security.forceLogout();

    await Promise.all([roleCreation, userCreation, logout]);

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

  const enableHostView = () => pageObjects.infraHostsView.clickEnableHostViewButton();

  // Tests

  describe('Hosts View', function () {
    this.tags('includeFirefox');

    before(async () => {
      await Promise.all([
        esArchiver.load('x-pack/test/functional/es_archives/infra/alerts'),
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
        kibanaServer.savedObjects.cleanStandardList(),
      ]);
    });

    after(() => {
      esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts');
      esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      browser.removeLocalStorageItem(HOSTS_LINK_LOCAL_STORAGE_KEY);
    });

    it('should be accessible from the Inventory page', async () => {
      await pageObjects.common.navigateToApp('infraOps');
      await pageObjects.infraHome.clickDismissKubernetesTourButton();
      await pageObjects.infraHostsView.clickTryHostViewBadge();

      const pageUrl = await browser.getCurrentUrl();

      expect(pageUrl).to.contain(HOSTS_VIEW_PATH);
    });

    describe('#Landing page', () => {
      beforeEach(() => {
        setHostViewEnabled(false);
      });

      it('as a user with read permission, should show hosts landing page with callout when the hosts view is disabled', async () => {
        await loginWithReadOnlyUser();
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);

        const landingPageDisabled = await pageObjects.infraHostsView.getHostsLandingPageDisabled();
        const learnMoreDocsUrl = await pageObjects.infraHostsView.getHostsLandingPageDocsLink();
        const parsedUrl = new URL(learnMoreDocsUrl);

        expect(parsedUrl.host).to.be('www.elastic.co');
        expect(parsedUrl.pathname).to.be('/guide/en/kibana/current/kibana-privileges.html');
        expect(landingPageDisabled).to.contain(
          'Your user role doesn’t have sufficient privileges to enable this feature'
        );

        await logoutAndDeleteReadOnlyUser();
      });

      it('as an admin, should see an enable button when the hosts view is disabled', async () => {
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);

        const landingPageEnableButton =
          await pageObjects.infraHostsView.getHostsLandingPageEnableButton();
        const landingPageEnableButtonText = await landingPageEnableButton.getVisibleText();
        expect(landingPageEnableButtonText).to.eql('Enable hosts view');
      });

      it('as an admin, should be able to enable the hosts view feature', async () => {
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await enableHostView();

        const titleElement = await find.byCssSelector('h1');
        const title = await titleElement.getVisibleText();

        expect(title).to.contain('Hosts');
      });
    });

    describe('#Page Content', () => {
      before(async () => {
        await setHostViewEnabled(true);
        await loginWithReadOnlyUser();
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
      });

      after(async () => {
        await logoutAndDeleteReadOnlyUser();
      });

      it('should render the correct page title', async () => {
        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain('Hosts - Infrastructure - Observability - Elastic');
      });

      it('should render a table with 6 hosts', async () => {
        const hosts = await pageObjects.infraHostsView.getHostsTableData();
        expect(hosts.length).to.equal(6);
      });

      describe('KPI tiles', () => {
        it('should render 5 metrics trend tiles', async () => {
          const hosts = await pageObjects.infraHostsView.getAllMetricsTrendTiles();
          expect(hosts.length).to.equal(5);
        });

        [
          { metric: 'hosts', value: '6' },
          { metric: 'cpu', value: '0.8%' },
          { metric: 'memory', value: '16.8%' },
          { metric: 'tx', value: '0 bit/s' },
          { metric: 'rx', value: '0 bit/s' },
        ].forEach(({ metric, value }) => {
          it(`${metric} tile should show ${value}`, async () => {
            const tileValue = await pageObjects.infraHostsView.getMetricsTrendTileValue(metric);
            expect(tileValue).to.eql(value);
          });
        });
      });

      describe('Metrics Tab', () => {
        it('should load 8 lens metric charts', async () => {
          const metricCharts = await pageObjects.infraHostsView.getAllMetricsCharts();
          expect(metricCharts.length).to.equal(8);
        });

        it('should have an option to open the chart in lens', async () => {
          await pageObjects.infraHostsView.getOpenInLensOption();
        });
      });

      describe('Alerts Tab', () => {
        const observability = getService('observability');
        const testSubjects = getService('testSubjects');
        const retry = getService('retry');

        const ACTIVE_ALERTS = 6;
        const RECOVERED_ALERTS = 4;
        const ALL_ALERTS = ACTIVE_ALERTS + RECOVERED_ALERTS;
        const COLUMNS = 5;

        before(async () => {
          await pageObjects.infraHostsView.visitAlertTab();
        });

        it('should correctly load the Alerts tab section when clicking on it', async () => {
          testSubjects.existOrFail('hostsView-alerts');
        });

        it('should correctly render a badge with the active alerts count', async () => {
          const alertsCountBadge = await pageObjects.infraHostsView.getAlertsTabCountBadge();
          const alertsCount = await alertsCountBadge.getVisibleText();

          expect(alertsCount).to.be('6');
        });

        // FLAKY: https://github.com/elastic/kibana/issues/153236
        describe.skip('#FilterButtonGroup', () => {
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

          it('can be filtered to only show "all" alerts using the filter button', async () => {
            await pageObjects.infraHostsView.setAlertStatusFilter();
            await retry.try(async () => {
              const tableRows = await observability.alerts.common.getTableCellsInRows();
              expect(tableRows.length).to.be(ALL_ALERTS);
            });
          });
        });

        describe('#AlertsTable', () => {
          it('should correctly render', async () => {
            await observability.alerts.common.getTableOrFail();
          });

          it('should renders the correct number of cells', async () => {
            await retry.try(async () => {
              const cells = await observability.alerts.common.getTableCells();
              expect(cells.length).to.be(ALL_ALERTS * COLUMNS);
            });
          });
        });
      });
    });
  });
};
