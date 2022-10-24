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
  const queryBar = getService('queryBar');
  const retry = getService('retry');

  describe('smoke telemetry tests', function () {
    let initialEvents: UiCounterEvent[] = [];
    let afterRefreshEvents: UiCounterEvent[] = [];

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

        initialEvents = await usageCollection.getUICounterEvents();

        await queryBar.clickQuerySubmitButton();
        await PageObjects.dashboard.waitForRenderComplete();

        afterRefreshEvents = await usageCollection.getUICounterEvents();

        expect(initialEvents.length).to.be.greaterThan(0);
        expect(afterRefreshEvents.length).to.be.greaterThan(0);
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard/with_by_value_visualizations'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const checkTelemetry = (eventName: string) => {
      const initialEvent = initialEvents.find((e) => e.eventName === eventName);
      const afterRefreshEvent = afterRefreshEvents.find((e) => e.eventName === eventName);

      expect(initialEvent).to.be.ok();
      expect(afterRefreshEvent).to.be.ok();
      expect(afterRefreshEvent!.total).to.be(initialEvent!.total + 1);
    };

    ['legacy_metric', 'donut', 'timelion', 'area_stacked', 'table', 'heatmap'].forEach((vis) => {
      it(`should trigger render event for "agg based" ${vis} visualization once`, async () =>
        checkTelemetry(`render_agg_based_${vis}`));
    });

    ['vega', 'tsvb_top_n', 'lens_vis_dashboard'].forEach((vis) => {
      it(`should trigger render event for ${vis} visualization once`, async () =>
        checkTelemetry(`render_${vis}`));
    });

    ['vertical_bar_stacked', 'dimension_date_histogram', 'dimension_count'].forEach((i) => {
      it(`should correctly trigger "render_lens${i}" lens event`, async () =>
        checkTelemetry(`render_lens_${i}`));
    });
  });
}
