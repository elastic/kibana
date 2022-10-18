/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'dashboard', 'timePicker']);

  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const usageCollection = getService('usageCollection');
  const retry = getService('retry');

  describe('smoke telemetry tests', function () {
    let items: Array<{
      key: string;
      appName: string;
      eventName: string;
      type: string;
      total: number;
    }> = [];

    before(async function () {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        `x-pack/test/functional/fixtures/kbn_archiver/dashboard/with_by_value_visualizations`
      );

      await retry.try(async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('visualizations');
        await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
        await PageObjects.dashboard.waitForRenderComplete();

        items = await usageCollection.getUICounterEvents();

        expect(items.length).to.be.greaterThan(0);
      });
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/dashboard/with_by_value_visualizations'
      );
      await kibanaServer.savedObjects.cleanStandardList();
    });

    const checkTelemetry = (eventName: string) => {
      const event = items.find((e) => e.eventName === eventName);

      expect(event).to.be.ok();
      expect(event!.total).to.be(1);
    };

    ['legacy_metric', 'donut', 'timelion', 'area_stacked', 'table', 'heatmap'].forEach((vis) => {
      it(`should trigger render event for "agg based" ${vis} visualization once`, async () =>
        checkTelemetry(`render_agg_based_${vis}`));
    });

    ['vega', 'tsvb_timeseries', 'lens_vis_dashboard'].forEach((vis) => {
      it(`should trigger render event for ${vis} visualization once`, async () =>
        checkTelemetry(`render_${vis}`));
    });

    ['vertical_bar_stacked', 'dimension_date_histogram', 'dimension_count'].forEach((i) => {
      it(`should correctly trigger "render_lens${i}" lens event`, async () =>
        checkTelemetry(`render_lens_${i}`));
    });
  });
}
