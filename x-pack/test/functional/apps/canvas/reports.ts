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
  const PageObjects = getPageObjects(['reporting', 'common', 'canvas']);
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
            feature: { canvas: ['read'] },
          },
        ],
      });
      await security.testUser.setRoles([
        'test_canvas_user',
        'reporting_user', // NOTE: the built-in role granting full reporting access is deprecated. See xpack.reporting.roles.enabled
      ]);
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
      it('downloaded PDF base64 string is correct with borders and logo', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout
        this.timeout(180000);

        await PageObjects.common.navigateToApp('canvas');
        await PageObjects.canvas.loadFirstWorkpad('The Very Cool Workpad for PDF Tests');

        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
        expect(res.get('content-disposition')).to.equal(
          'attachment; filename="The Very Cool Workpad for PDF Tests.pdf"'
        );

        /* Check the value of the PDF data that was generated
         * PDF files include dynamic meta info such as creation date.
         * This checks only the first few thousand bytes of the Buffer
         */
        const pdfStrings = await (
          await PageObjects.reporting.getRawPdfReportData(url)
        ).toString('utf-8', 14);
        const [header, , contents, , info] = pdfStrings.split('stream'); // ignore everthing from `stream` to `endstream` - the non-utf8 blocks

        // PDF (this should really be a visual test)
        expectSnapshot(header).toMatch();

        // TODO contents are non-deterministic
        // expectSnapshot(
        //   contents).toMatch();

        expectSnapshot(info.replace(/D:\d+Z/, 'D:DATESTAMP')).toMatch();
      });

      it('downloaded PDF base64 string is correct without borders and logo', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout
        this.timeout(180000);

        await PageObjects.common.navigateToApp('canvas');
        await PageObjects.canvas.loadFirstWorkpad('The Very Cool Workpad for PDF Tests');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.toggleReportMode();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
        expect(res.get('content-disposition')).to.equal(
          'attachment; filename="The Very Cool Workpad for PDF Tests.pdf"'
        );

        /* Check the value of the PDF data that was generated
         * PDF files include dynamic meta info such as creation date.
         * This checks only the first few thousand bytes of the Buffer
         */
        const pdfStrings = await (
          await PageObjects.reporting.getRawPdfReportData(url)
        ).toString('utf-8', 14);
        const [header, , contents, , info] = pdfStrings.split('stream'); // ignore everthing from `stream` to `endstream` - the non-utf8 blocks

        // PDF (this should really be a visual test)
        expectSnapshot(header).toMatch();

        // TODO contents are non-deterministic
        // expectSnapshot(
        //   contents).toMatch();

        expectSnapshot(info.replace(/D:\d+Z/, 'D:DATESTAMP')).toMatch();
      });
    });
  });
}
