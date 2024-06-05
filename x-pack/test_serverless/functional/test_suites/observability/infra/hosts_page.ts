/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../../ftr_provider_context';

import { HOSTS_VIEW_PATH } from './constants';
import { DATES, DATE_PICKER_FORMAT } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects([
    'assetDetails',
    'common',
    'infraHome',
    'timePicker',
    'infraHostsView',
    'settings',
    'header',
    'svlCommonPage',
  ]);

  const waitForPageToLoad = async () =>
    await retry.waitFor(
      'wait for table and KPI charts to load',
      async () =>
        (await pageObjects.infraHostsView.isHostTableLoaded()) &&
        (await pageObjects.infraHostsView.isKPIChartsLoaded())
    );

  describe('Hosts Page', function () {
    before(async () => {
      await Promise.all([
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
      ]);
      await pageObjects.svlCommonPage.login();
      await browser.setWindowSize(1600, 1200);
    });

    after(async () => {
      await Promise.all([
        esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'),
      ]);
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('#Single Host Flyout', () => {
      before(async () => {
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      describe('Tabs', () => {
        before(async () => {
          await pageObjects.timePicker.setAbsoluteRange(
            START_DATE.format(DATE_PICKER_FORMAT),
            END_DATE.format(DATE_PICKER_FORMAT)
          );

          await waitForPageToLoad();

          await pageObjects.infraHostsView.clickTableOpenFlyoutButton();
        });

        after(async () => {
          await retry.try(async () => {
            await pageObjects.infraHome.clickCloseFlyoutButton();
          });
        });

        describe('Overview Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOverviewTab();
          });

          [
            { metric: 'cpu', chartsCount: 2 },
            { metric: 'memory', chartsCount: 1 },
            { metric: 'disk', chartsCount: 2 },
            { metric: 'network', chartsCount: 1 },
          ].forEach(({ metric, chartsCount }) => {
            it(`should render ${chartsCount} ${metric} chart(s) in the Metrics section`, async () => {
              const charts = await pageObjects.assetDetails.getOverviewTabHostMetricCharts(metric);
              expect(charts.length).to.equal(chartsCount);
            });
          });

          it('should show alerts', async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            await pageObjects.assetDetails.overviewAlertsTitleExists();
            const CreateRuleButtonExist = await testSubjects.exists(
              'infraAssetDetailsCreateAlertsRuleButton'
            );
            expect(CreateRuleButtonExist).to.be(true);
          });
        });

        describe('Metadata Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetadataTab();
          });

          it('should show metadata table', async () => {
            await pageObjects.assetDetails.metadataTableExists();
          });
        });

        describe('Processes Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickProcessesTab();
          });

          it('should show processes title', async () => {
            await await testSubjects.existOrFail('infraAssetDetailsTopProcessesTitle');
          });
        });

        describe('Logs Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickLogsTab();
          });

          it('should render logs tab', async () => {
            await pageObjects.assetDetails.logsExists();
          });
        });
      });

      describe('#Page Content', () => {
        before(async () => {
          await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
          await pageObjects.header.waitUntilLoadingHasFinished();
          await pageObjects.timePicker.setAbsoluteRange(
            START_DATE.format(DATE_PICKER_FORMAT),
            END_DATE.format(DATE_PICKER_FORMAT)
          );

          await waitForPageToLoad();
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
        });

        describe('KPIs', () => {
          it('should render KPIs', async () => {
            await testSubjects.existOrFail('hostsViewKPIGrid');
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

          it('should load 11 lens metric charts', async () => {
            const metricCharts = await pageObjects.infraHostsView.getAllMetricsCharts();
            expect(metricCharts.length).to.equal(11);
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
        });

        describe('Alerts Tab', () => {
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
        });
      });
    });
  });
};
