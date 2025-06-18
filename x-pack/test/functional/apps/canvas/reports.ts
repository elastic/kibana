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
          'inline; filename="The Very Cool Workpad for PDF Tests.pdf"'
        );

        /* Check the value of the PDF data that was generated
         * PDF files include dynamic meta info such as creation date.
         * This checks only the first few thousand bytes of the Buffer
         */
        const pdfStrings = (res.body as Buffer).toString('utf8', 14); // start on byte 14 to skip non-utf8 data
        const [header, , contents, , info] = pdfStrings.split('stream'); // ignore everything from `stream` to `endstream` - the non-utf8 blocks

        // PDF Header

        expectSnapshot(header).toMatchInline(`
          "
          6 0 obj
          <<
          /Predictor 15
          /Colors 3
          /BitsPerComponent 8
          /Columns 16
          >>
          endobj
          5 0 obj
          <<
          /Type /XObject
          /Subtype /Image
          /BitsPerComponent 8
          /Width 16
          /Height 16
          /Filter /FlateDecode
          /DecodeParms 6 0 R
          /ColorSpace /DeviceRGB
          /Length 25
          >>
          "
        `);

        // PDF Contents

        expectSnapshot(contents).toMatchInline(`
          "
          endobj
          8 0 obj
          <<
          /Predictor 15
          /Colors 1
          /BitsPerComponent 8
          /Columns 577
          >>
          endobj
          9 0 obj
          <<
          /Length 158
          /Filter /FlateDecode
          >>
          "
        `);

        // PDF Info

        // The Info section of text includes a Datestamp which will obviously not match as a snapshot between tests
        // This does a .replace on the Info text to erase the dynamic date string
        expectSnapshot(info.replace(/D:\d+Z/, 'D:DATESTAMP')).toMatchInline(`
          "
          endobj
          13 0 obj
          <<
          /Type /ExtGState
          /ca 1
          /CA 1
          >>
          endobj
          12 0 obj
          <<
          /Type /Page
          /Parent 1 0 R
          /MediaBox [0 0 90 189]
          /Contents 10 0 R
          /Resources 11 0 R
          >>
          endobj
          11 0 obj
          <<
          /ProcSet [/PDF /Text /ImageB /ImageC /ImageI]
          /ExtGState <<
          /Gs1 13 0 R
          >>
          /XObject <<
          /I1 5 0 R
          /I2 7 0 R
          >>
          /Font <<
          /F1 14 0 R
          >>
          >>
          endobj
          10 0 obj
          <<
          /Length 268
          /Filter /FlateDecode
          >>
          "
        `);

        const contentLength = parseInt(res.get('content-length'), 10);
        expect(contentLength >= 20620 && contentLength <= 20622).to.be(true); // contentLength can be between 20620 and 20622
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
          'inline; filename="The Very Cool Workpad for PDF Tests.pdf"'
        );

        /* Check the value of the PDF data that was generated
         * PDF files include dynamic meta info such as creation date.
         * This checks only the first few thousand bytes of the Buffer
         */
        const pdfStrings = (res.body as Buffer).toString('utf8', 14); // start on byte 14 to skip non-utf8 data
        const [header, , contents, , info] = pdfStrings.split('stream'); // ignore everything from `stream` to `endstream` - the non-utf8 blocks

        // PDF Header

        expectSnapshot(header).toMatchInline(`
          "
          6 0 obj
          <<
          /Predictor 15
          /Colors 3
          /BitsPerComponent 8
          /Columns 16
          >>
          endobj
          5 0 obj
          <<
          /Type /XObject
          /Subtype /Image
          /BitsPerComponent 8
          /Width 16
          /Height 16
          /Filter /FlateDecode
          /DecodeParms 6 0 R
          /ColorSpace /DeviceRGB
          /Length 25
          >>
          "
        `);

        // PDF Contents

        expectSnapshot(contents.replace(/D:\d+Z/, 'D:DATESTAMP')).toMatchInline(`
          "
          endobj
          10 0 obj
          <<
          /Type /ExtGState
          /ca 1
          /CA 1
          >>
          endobj
          9 0 obj
          <<
          /Type /Page
          /Parent 1 0 R
          /MediaBox [0 0 8 8]
          /Contents 7 0 R
          /Resources 8 0 R
          >>
          endobj
          8 0 obj
          <<
          /ProcSet [/PDF /Text /ImageB /ImageC /ImageI]
          /ExtGState <<
          /Gs1 10 0 R
          >>
          /XObject <<
          /I1 5 0 R
          >>
          >>
          endobj
          7 0 obj
          <<
          /Length 47
          /Filter /FlateDecode
          >>
          "
        `);

        // PDF Info
        expectSnapshot(info.replace(/D:\d+Z/, 'D:DATESTAMP').replace(/\/ID\s\[.*\]/, 'ID []'))
          .toMatchInline(`
          "
          endobj
          12 0 obj
          (pdfmake)
          endobj
          13 0 obj
          (pdfmake)
          endobj
          14 0 obj
          (D:DATESTAMP)
          endobj
          11 0 obj
          <<
          /Producer 12 0 R
          /Creator 13 0 R
          /CreationDate 14 0 R
          >>
          endobj
          4 0 obj
          <<
          >>
          endobj
          3 0 obj
          <<
          /Type /Catalog
          /Pages 1 0 R
          /Names 2 0 R
          >>
          endobj
          1 0 obj
          <<
          /Type /Pages
          /Count 1
          /Kids [9 0 R]
          >>
          endobj
          2 0 obj
          <<
          /Dests <<
            /Names [
          ]
          >>
          >>
          endobj
          xref
          0 15
          0000000000 65535 f 
          0000000939 00000 n 
          0000000996 00000 n 
          0000000877 00000 n 
          0000000856 00000 n 
          0000000092 00000 n 
          0000000015 00000 n 
          0000000574 00000 n 
          0000000453 00000 n 
          0000000353 00000 n 
          0000000302 00000 n 
          0000000780 00000 n 
          0000000692 00000 n 
          0000000718 00000 n 
          0000000744 00000 n 
          trailer
          <<
          /Size 15
          /Root 3 0 R
          /Info 11 0 R
          ID []
          >>
          startxref
          1043
          %%EOF
          "
        `);

        expect(res.get('content-length')).to.be('1498');
      });
    });
  });
}
