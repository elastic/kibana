/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

interface UiCounterEvent {
  eventName: string;
  total: number;
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker']);

  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const usageCollection = getService('usageCollection');
  const renderable = getService('renderable');
  const queryBar = getService('queryBar');
  const retry = getService('retry');

  describe('smoke telemetry tests', function () {
    let uiCounterEvents: UiCounterEvent[] = [];

    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        `x-pack/test/functional/fixtures/kbn_archiver/dashboard/with_by_value_visualizations`
      );

      await retry.try(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('visualizations');
        await PageObjects.timePicker.setDefaultAbsoluteRange();
        await PageObjects.dashboard.waitForRenderComplete();

        uiCounterEvents = await usageCollection.getUICounterEvents();

        expect(uiCounterEvents.length).to.be.greaterThan(0);
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard/with_by_value_visualizations'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const checkTelemetry = (eventName: string) => {
      const initialEvent = uiCounterEvents.find((e) => e.eventName === eventName);

      expect(initialEvent).to.be.ok();
    };

    ['legacy_metric', 'donut', 'timelion', 'area_stacked', 'table', 'heatmap'].forEach((vis) => {
      it(`should trigger render event for "agg based" ${vis} visualization`, async () =>
        checkTelemetry(`render_agg_based_${vis}`));
    });

    ['vega', 'tsvb_top_n', 'lens_vis_dashboard'].forEach((vis) => {
      it(`should trigger render event for ${vis} visualization`, async () =>
        checkTelemetry(`render_${vis}`));
    });

    ['vertical_bar_stacked', 'dimension_date_histogram', 'dimension_count'].forEach((i) => {
      it(`should correctly trigger "render_lens${i}" lens event`, async () =>
        checkTelemetry(`render_lens_${i}`));
    });

    describe('should render visualization once', async () => {
      let initialRenderCountMap: Record<string, number> = {};
      let afterRefreshRenderCountMap: Record<string, number> = {};

      before(async function () {
        const sharedItemsCount = Number(await PageObjects.dashboard.getSharedItemsCount());
        initialRenderCountMap = await renderable.getRenderCount(sharedItemsCount);

        await queryBar.clickQuerySubmitButton();
        await PageObjects.dashboard.waitForRenderComplete();

        afterRefreshRenderCountMap = await renderable.getRenderCount(sharedItemsCount);
      });

      ['Lens', 'TSVB', 'Vega', 'Table', 'Timelion', 'Pie', 'Metric', 'Heatmap', 'Area'].forEach(
        (key) => {
          it(`should correctly render ${key} visualization once`, async () =>
            expect(afterRefreshRenderCountMap[key]).to.be(initialRenderCountMap[key] + 1));
        }
      );
    });
  });
}
