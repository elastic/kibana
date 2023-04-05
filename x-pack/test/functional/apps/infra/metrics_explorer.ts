/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const START_DATE = moment.utc(DATES.metricsAndLogs.hosts.min);
const END_DATE = moment.utc(DATES.metricsAndLogs.hosts.max);
const timepickerFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const pageObjects = getPageObjects([
    'common',
    'infraHome',
    'infraMetricsExplorer',
    'timePicker',
    'infraSavedViews',
  ]);

  describe('Metrics Explorer', function () {
    this.tags('includeFirefox');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Basic Functionality', () => {
      before(async () => {
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.goToMetricExplorer();
        await pageObjects.timePicker.setAbsoluteRange(
          START_DATE.format(timepickerFormat),
          END_DATE.format(timepickerFormat)
        );
      });
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));

      it('should render the correct page title', async () => {
        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain(
          'Metrics Explorer - Infrastructure - Observability - Elastic'
        );
      });

      it('should have three metrics by default', async () => {
        const metrics = await pageObjects.infraMetricsExplorer.getMetrics();
        expect(metrics.length).to.equal(3);
      });

      it('should remove metrics one by one', async () => {
        await pageObjects.infraMetricsExplorer.removeMetric('system.cpu.total.norm.pct');
        await pageObjects.infraMetricsExplorer.removeMetric('kubernetes.pod.cpu.usage.node.pct');
        await pageObjects.infraMetricsExplorer.removeMetric('docker.cpu.total.pct');
        const metrics = await pageObjects.infraMetricsExplorer.getMetrics();
        expect(metrics.length).to.equal(0);
      });

      it('should display "Missing Metric" message for zero metrics', async () => {
        await pageObjects.infraMetricsExplorer.getMissingMetricMessage();
      });

      it('should add a metric', async () => {
        await pageObjects.infraMetricsExplorer.addMetric('system.cpu.user.pct');
        const metrics = await pageObjects.infraMetricsExplorer.getMetrics();
        expect(metrics.length).to.equal(1);
      });

      it('should set "graph per" to "host.name"', async () => {
        await pageObjects.infraMetricsExplorer.setGroupBy('host.name');
      });

      it('should display multple charts', async () => {
        const charts = await pageObjects.infraMetricsExplorer.getCharts();
        expect(charts.length).to.equal(6);
      });

      it('should render as area chart by default', async () => {
        const charts = await pageObjects.infraMetricsExplorer.getCharts();
        const chartType = await pageObjects.infraMetricsExplorer.getChartType(charts[0]);
        expect(chartType).to.equal('area chart');
      });

      it('should change to bar chart', async () => {
        await pageObjects.infraMetricsExplorer.switchChartType('bar');
        const charts = await pageObjects.infraMetricsExplorer.getCharts();
        const chartType = await pageObjects.infraMetricsExplorer.getChartType(charts[0]);
        expect(chartType).to.equal('bar chart');
      });
    });

    describe('Saved Views', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
      describe('save functionality', () => {
        it('should have saved views component', async () => {
          await pageObjects.common.navigateToApp('infraOps');
          await pageObjects.infraHome.goToMetricExplorer();
          await pageObjects.infraSavedViews.getSavedViewsButton();
          await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
        });

        it('should open popover', async () => {
          await pageObjects.infraSavedViews.clickSavedViewsButton();
          await pageObjects.infraSavedViews.closeSavedViewsPopover();
        });

        it('should create new saved view and load it', async () => {
          await pageObjects.infraSavedViews.clickSavedViewsButton();
          await pageObjects.infraSavedViews.clickSaveNewViewButton();
          await pageObjects.infraSavedViews.getCreateSavedViewModal();
          await pageObjects.infraSavedViews.createNewSavedView('view1');
          await pageObjects.infraSavedViews.ensureViewIsLoaded('view1');
        });

        it('should new views should be listed in the load views list', async () => {
          await pageObjects.infraSavedViews.clickSavedViewsButton();
          await pageObjects.infraSavedViews.clickLoadViewButton();
          await pageObjects.infraSavedViews.ensureViewIsLoadable('view1');
          await pageObjects.infraSavedViews.closeSavedViewsLoadModal();
        });
      });
    });
  });
};
