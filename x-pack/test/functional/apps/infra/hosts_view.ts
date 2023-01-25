/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
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

  const loginWithReadOnlyUserAndNavigateToInfra = async () => {
    await security.role.create('global_hosts_read_privileges_role', {
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

    await security.user.create('global_hosts_read_privileges_user', {
      password: 'global_hosts_read_privileges_user-password',
      roles: ['global_hosts_read_privileges_role'],
      full_name: 'test user',
    });

    await pageObjects.security.forceLogout();

    await pageObjects.security.login(
      'global_hosts_read_privileges_user',
      'global_hosts_read_privileges_user-password',
      {
        expectSpaceSelector: false,
      }
    );

    await pageObjects.common.navigateToApp('infraOps');
  };

  const logoutAndDeleteReadOnlyUser = async () => {
    await pageObjects.security.forceLogout();
    await Promise.all([
      security.role.delete('global_hosts_read_privileges_role'),
      security.user.delete('global_hosts_read_privileges_user'),
    ]);
  };

  const navigateAndDisableHostView = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    await pageObjects.common.navigateToApp('infraOps');
    await pageObjects.common.navigateToUrl('management', 'kibana/settings', {
      basePath: `/s/default`,
      ensureCurrentUrl: false,
      shouldLoginIfPrompted: false,
      shouldUseHashForSubUrl: false,
    });
    await pageObjects.settings.toggleAdvancedSettingCheckbox(
      'observability:enableInfrastructureHostsView',
      false
    );
    return esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
  };

  const navigateAndEnableHostView = async () => {
    await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
    await pageObjects.common.navigateToApp('infraOps');
    await pageObjects.infraHostsView.clickTryHostViewLink();
    await pageObjects.infraHostsView.clickEnableHostViewButton();
  };

  // Tests

  describe('Hosts view', function () {
    this.tags('includeFirefox');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('shows hosts view landing page for admin', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHostsView.clickTryHostViewBadge();
      });
      after(async () => {
        return esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('should show hosts landing page with enable button when the hosts view is disabled', async () => {
        const landingPageEnableButton =
          await pageObjects.infraHostsView.getHostsLandingPageEnableButton();
        const landingPageEnableButtonText = await landingPageEnableButton.getVisibleText();
        expect(landingPageEnableButtonText).to.eql('Enable hosts view');
      });
    });

    describe('should show hosts view landing page for user with read permission', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await loginWithReadOnlyUserAndNavigateToInfra();
        await pageObjects.infraHostsView.clickTryHostViewBadge();
      });
      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await logoutAndDeleteReadOnlyUser();
        return esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('should show hosts landing page with callout when the hosts view is disabled', async () => {
        const landingPageDisabled = await pageObjects.infraHostsView.getHostsLandingPageDisabled();
        const learnMoreDocsUrl = await pageObjects.infraHostsView.getHostsLandingPageDocsLink();
        const parsedUrl = new URL(learnMoreDocsUrl);

        expect(parsedUrl.host).to.be('www.elastic.co');
        expect(parsedUrl.pathname).to.be('/guide/en/kibana/current/kibana-privileges.html');
        expect(landingPageDisabled).to.contain(
          'Your user learnMore doesn’t have sufficient privileges to enable this feature'
        );
      });
    });

    describe('enables hosts view page and checks content', () => {
      before(async () => {
        await navigateAndEnableHostView();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
      });
      after(async () => {
        await navigateAndDisableHostView();
      });

      describe('should show hosts page for admin user and see the page content', async () => {
        it('should render the correct page title', async () => {
          const documentTitle = await browser.getTitle();
          expect(documentTitle).to.contain('Hosts - Infrastructure - Observability - Elastic');
        });

        it('should have six hosts', async () => {
          const hosts = await pageObjects.infraHostsView.getHostsTableData();
          expect(hosts.length).to.equal(6);
        });

        it('should load 5 metrics trend tiles', async () => {
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
    });

    describe('should show hosts page for read only user and see the page content', async () => {
      before(async () => {
        await navigateAndEnableHostView();
        await loginWithReadOnlyUserAndNavigateToInfra();
        await pageObjects.infraHostsView.clickTryHostViewLink();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
      });
      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await logoutAndDeleteReadOnlyUser();
        await navigateAndDisableHostView();
      });

      it('should have six hosts', async () => {
        const hosts = await pageObjects.infraHostsView.getHostsTableData();
        expect(hosts.length).to.equal(6);
      });

      it('should load 5 metrics trend tiles', async () => {
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

      describe('Lens charts', () => {
        it('should load 7 lens metric charts', async () => {
          const metricCharts = await pageObjects.infraHostsView.getAllMetricsCharts();
          expect(metricCharts.length).to.equal(7);
        });

        it('should have an option to open the chart in lens', async () => {
          await pageObjects.infraHostsView.getOpenInLensOption();
        });
      });
    });
  });
};
