/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Url from 'url';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function promotionTrackingDashboard({ getService }: FtrProviderContext) {
  describe('Promotion Tracking Dashboard', () => {
    const config = getService('config');
    const playwright = getService('playwright');
    const esArchiver = getService('esArchiver');
    const kibanaServer = getService('kibanaServer');
    const { page } = playwright.makePage({
      autoLogin: true,
      journeyName: 'promotion_tracking_dashboard',
    });

    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/performance/kbn_archives/promotion_tracking_dashboard.json'
      );
      await esArchiver.loadIfNeeded('x-pack/test/performance/es_archives/ecommerce_sample_data');
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/performance/kbn_archives/promotion_tracking_dashboard.json'
      );
      await esArchiver.unload('x-pack/test/performance/es_archives/ecommerce_sample_data');
    });

    it('Go to Dashboards Page', async () => {
      const kibanaUrl = Url.format({
        protocol: config.get('servers.kibana.protocol'),
        hostname: config.get('servers.kibana.hostname'),
        port: config.get('servers.kibana.port'),
      });

      await page.goto(`${kibanaUrl}/app/dashboards`);
      await page.waitForSelector('text="Dashboards"');
    });

    it('Go to Promotion Tracking Dashboard', async () => {
      const promotionDashboardButton = page.locator('text="Promotion Tracking"');
      await promotionDashboardButton.click();
    });

    it('Go to Promotion Tracking Dashboard', async () => {
      await page.waitForFunction(() => {
        const visualizations = Array.from(document.querySelectorAll('[data-rendering-count]'));
        const visualizationElementsLoaded = visualizations.length > 0;
        const visualizationAnimationsFinished = visualizations.every(
          (e) => e.getAttribute('data-render-complete') === 'true'
        );
        return visualizationElementsLoaded && visualizationAnimationsFinished;
      });
    });
  });
}
