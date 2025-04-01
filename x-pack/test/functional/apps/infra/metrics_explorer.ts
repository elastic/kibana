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
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  describe('Metrics Explorer', function () {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Basic Functionality', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
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
        await retry.try(async () => {
          const charts = await pageObjects.infraMetricsExplorer.getCharts();
          expect(charts.length).to.equal(6);
        });
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

      it('renders the metrics explorer survey link', async () => {
        await pageObjects.infraMetricsExplorer.ensureMetricsExplorerFeedbackLinkIsVisible();
      });

      it('should not allow adding more than 20 metrics', async () => {
        await pageObjects.infraMetricsExplorer.clearMetrics();

        const fields = [
          'process.cpu.pct',
          'process.memory.pct',
          'system.core.total.pct',
          'system.core.user.pct',
          'system.core.nice.pct',
          'system.core.idle.pct',
          'system.core.iowait.pct',
          'system.core.irq.pct',
          'system.core.softirq.pct',
          'system.core.steal.pct',
          'system.cpu.nice.pct',
          'system.cpu.idle.pct',
          'system.cpu.iowait.pct',
          'system.cpu.irq.pct',
          'system.cpu.softirq.pct',
          'system.cpu.steal.pct',
          'system.cpu.user.norm.pct',
          'system.memory.free',
          'kubernetes.pod.cpu.usage.node.pct',
          'docker.cpu.total.pct',
        ];

        for (const field of fields) {
          await pageObjects.infraMetricsExplorer.addMetric(field);
        }

        await pageObjects.infraMetricsExplorer.ensureMaxMetricsLimiteReachedIsVisible();
      });
    });

    describe('Saved Views', function () {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.infraHome.goToMetricExplorer();
      });

      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));

      beforeEach(async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
      });
      afterEach(async () => {
        await pageObjects.infraSavedViews.closeSavedViewsPopover();
      });

      it('should render a button with the view name', async () => {
        await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
      });

      it('should open/close the views popover menu on button click', async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await testSubjects.existOrFail('savedViews-popover');
        await pageObjects.infraSavedViews.closeSavedViewsPopover();
      });

      it('should create a new saved view and load it', async () => {
        await pageObjects.infraSavedViews.createView('view1');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view1');
      });

      it('should load a clicked view from the manage views section', async () => {
        const views = await pageObjects.infraSavedViews.getManageViewsEntries();
        await views[0].click();
        await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
      });

      it('should update the current saved view and load it', async () => {
        let views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(2);
        await pageObjects.infraSavedViews.pressEsc();

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await pageObjects.infraSavedViews.createView('view2');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view2');

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(3);
        await pageObjects.infraSavedViews.pressEsc();

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await pageObjects.infraSavedViews.updateView('view3');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view3');

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(3);
        await pageObjects.infraSavedViews.pressEsc();
      });
    });
  });
};
