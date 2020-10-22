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
        await PageObjects.canvas.loadSavedWorkpad('The Very Cool Workpad for PDF Tests');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');
        expect(res.header['content-disposition']).to.equal(
          'inline; filename="The Very Cool Workpad for PDF Tests.pdf"'
        );

        /* Check the value of the PDF data that was generated
         * PDF files include dynamic meta info such as creation date
         * but the first 636 characters of base64 should match the baseline PDF
         */
        const encodedPdf = (res.body as Buffer).toString('base64');
        const commonString = encodedPdf.slice(0, 636);
        expect(commonString).to.eql(
          `JVBERi0xLjMKJf////8KOSAwIG9iago8PAovVHlwZSAvRXh0R1N0YXRlCi9jYSAxCi9DQSAxCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbn` +
            `QgMSAwIFIKL01lZGlhQm94IFswIDAgMTYgMTZdCi9Db250ZW50cyA2IDAgUgovUmVzb3VyY2VzIDcgMCBSCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9Qcm9jU2V0IFsv` +
            `UERGIC9UZXh0IC9JbWFnZUIgL0ltYWdlQyAvSW1hZ2VJXQovRXh0R1N0YXRlIDw8Ci9HczEgOSAwIFIKPj4KL1hPYmplY3QgPDwKL0kxIDUgMCBSCj4+Cj4+CmVuZG` +
            `9iago2IDAgb2JqCjw8Ci9MZW5ndGggNDYKL0ZpbHRlciAvRmxhdGVEZWNvZGUKPj4Kc3RyZWFtCnicM1QwAEJdQyBhaKaQnMul715sqJBezFXIBeRD5MwQkp6GCi75` +
            `XIFcADOJCycKZW5kc3RyZWFtCmVuZG9iagoxMSAwIG9iagoocGRmbWFrZSkKZW5kb2JqCjEyIDAgb2JqCihwZGZtYWtlKQplbmRvYmoKMTMgMCBvYmoKKEQ6MjAyMD` +
            `EwMjIx`
        );
      });
    });
  });
}
