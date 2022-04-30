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

    // FLAKY: https://github.com/elastic/kibana/issues/122137
    describe.skip('Print PDF button', () => {
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
        const [header, , contents, , info] = pdfStrings.split('stream'); // ignore everthing from `stream` to `endstream` - the non-utf8 blocks

        // PDF Header

        expectSnapshot(header).toMatchInline(`
          "
          7 0 obj
          <<
          /Predictor 15
          /Colors 1
          /BitsPerComponent 8
          /Columns 577
          >>
          endobj
          8 0 obj
          <<
          /Length 149
          /Filter /FlateDecode
          >>
          "
        `);

        // PDF Contents

        expectSnapshot(contents).toMatchInline(`
          "
          endobj
          12 0 obj
          <<
          /Type /ExtGState
          /ca 1
          /CA 1
          >>
          endobj
          11 0 obj
          <<
          /Type /Page
          /Parent 1 0 R
          /MediaBox [0 0 90 189]
          /Contents 9 0 R
          /Resources 10 0 R
          >>
          endobj
          10 0 obj
          <<
          /ProcSet [/PDF /Text /ImageB /ImageC /ImageI]
          /ExtGState <<
          /Gs1 12 0 R
          >>
          /XObject <<
          /I1 5 0 R
          /I2 6 0 R
          >>
          /Font <<
          /F1 13 0 R
          >>
          >>
          endobj
          9 0 obj
          <<
          /Length 270
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
          15 0 obj
          (pdfmake)
          endobj
          16 0 obj
          (pdfmake)
          endobj
          17 0 obj
          (D:DATESTAMP)
          endobj
          14 0 obj
          <<
          /Producer 15 0 R
          /Creator 16 0 R
          /CreationDate 17 0 R
          >>
          endobj
          19 0 obj
          <<
          /Type /FontDescriptor
          /FontName /BZZZZZ+Roboto-Regular
          /Flags 4
          /FontBBox [-681.152344 -270.996094 1181.640625 1047.851563]
          /ItalicAngle 0
          /Ascent 927.734375
          /Descent -244.140625
          /CapHeight 710.9375
          /XHeight 528.320313
          /StemV 0
          /FontFile2 18 0 R
          >>
          endobj
          20 0 obj
          <<
          /Type /Font
          /Subtype /CIDFontType2
          /BaseFont /BZZZZZ+Roboto-Regular
          /CIDSystemInfo <<
          /Registry (Adobe)
          /Ordering (Identity)
          /Supplement 0
          >>
          /FontDescriptor 19 0 R
          /W [0 [507 596.679688 566.40625 526.855469 247.558594 637.207031 547.851563 566.40625 561.523438 566.40625 342.773438]]
          /CIDToGIDMap /Identity
          >>
          endobj
          21 0 obj
          <<
          /Length 250
          /Filter /FlateDecode
          >>
          "
        `);

        const contentLength = parseInt(res.get('content-length'), 10);
        expect(contentLength >= 20725 && contentLength <= 20726).to.be(true); // contentLength can be between 20725 and 20726
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
        const [header, , contents, , info] = pdfStrings.split('stream'); // ignore everthing from `stream` to `endstream` - the non-utf8 blocks

        // PDF Header

        expectSnapshot(header).toMatchInline(`
                  "
                  9 0 obj
                  <<
                  /Type /ExtGState
                  /ca 1
                  /CA 1
                  >>
                  endobj
                  8 0 obj
                  <<
                  /Type /Page
                  /Parent 1 0 R
                  /MediaBox [0 0 8 8]
                  /Contents 6 0 R
                  /Resources 7 0 R
                  >>
                  endobj
                  7 0 obj
                  <<
                  /ProcSet [/PDF /Text /ImageB /ImageC /ImageI]
                  /ExtGState <<
                  /Gs1 9 0 R
                  >>
                  /XObject <<
                  /I1 5 0 R
                  >>
                  >>
                  endobj
                  6 0 obj
                  <<
                  /Length 45
                  /Filter /FlateDecode
                  >>
                  "
                `);

        // PDF Contents

        expectSnapshot(contents.replace(/D:\d+Z/, 'D:DATESTAMP')).toMatchInline(`
                  "
                  endobj
                  11 0 obj
                  (pdfmake)
                  endobj
                  12 0 obj
                  (pdfmake)
                  endobj
                  13 0 obj
                  (D:DATESTAMP)
                  endobj
                  10 0 obj
                  <<
                  /Producer 11 0 R
                  /Creator 12 0 R
                  /CreationDate 13 0 R
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
                  /Kids [8 0 R]
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
                  14 0 obj
                  <<
                  /Type /XObject
                  /Subtype /Image
                  /Height 16
                  /Width 16
                  /BitsPerComponent 8
                  /Filter /FlateDecode
                  /ColorSpace /DeviceGray
                  /Decode [0 1]
                  /Length 12
                  >>
                  "
                `);

        // PDF Info
        expectSnapshot(info).toMatchInline(`
                  "
                  endobj
                  5 0 obj
                  <<
                  /Type /XObject
                  /Subtype /Image
                  /BitsPerComponent 8
                  /Width 16
                  /Height 16
                  /Filter /FlateDecode
                  /ColorSpace /DeviceRGB
                  /SMask 14 0 R
                  /Length 17
                  >>
                  "
                `);

        expect(res.get('content-length')).to.be('1598');
      });
    });
  });
}
