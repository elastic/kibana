/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const log = getService('log');
  const security = getService('security');
  const { reporting, canvas } = getPageObjects(['reporting', 'canvas']);
  const archive = 'x-pack/test/functional/fixtures/kbn_archiver/canvas/reports';

  describe('Canvas PDF Report Generation', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await security.role.create('test_canvas_user', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [
          {
            spaces: ['*'],
            base: [],
            feature: { canvas: ['read', 'generate_report'] },
          },
        ],
      });
      await security.testUser.setRoles(['test_canvas_user']);
      await kibanaServer.importExport.load(archive);
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await kibanaServer.importExport.unload(archive);
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    describe('Print PDF button', () => {
      it('creates a PDF with correct response headers', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout
        this.timeout(180000);

        await canvas.goToListingPage();
        await canvas.loadFirstWorkpad('The Very Cool Workpad for PDF Tests');

        await reporting.openShareMenuItem('PDF Reports');
        await reporting.clickGenerateReportButton();

        const url = await reporting.getReportURL(60000);
        const res = await reporting.getResponse(url ?? '');

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
        expect(res.get('content-disposition')).to.equal(
          'attachment; filename=The%20Very%20Cool%20Workpad%20for%20PDF%20Tests.pdf'
        );
      });
    });
  });
}
