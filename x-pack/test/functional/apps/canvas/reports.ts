/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const security = getService('security');
  const PageObjects = getPageObjects(['reporting', 'common', 'canvas']);

  describe('PDF Report Generation', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await security.testUser.setRoles(['kibana_admin', 'reporting_user']);
      await esArchiver.load('canvas/reports');
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await esArchiver.unload('canvas/reports');
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    describe('Print PDF button', () => {
      it('downloaded PDF base64 string is correct', async function () {
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

        expect(header).to.be(
          `
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
`
        );
        expect(contents.replace(/D:\d+Z/, 'DATESTAMP')).to.be(
          `
endobj
11 0 obj
(pdfmake)
endobj
12 0 obj
(pdfmake)
endobj
13 0 obj
(DATESTAMP)
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
`
        );
        expect(info).to.be(
          `
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
`
        );

        expect(res.get('content-length')).to.equal('1598');
      });
    });
  });
}
