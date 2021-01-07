/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { checkIfPngsMatch } from './lib/compare_pngs';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

const REPORTS_FOLDER = path.resolve(__dirname, 'reports');

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['reporting', 'common', 'dashboard']);
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const log = getService('log');
  const config = getService('config');
  const es = getService('es');
  const testSubjects = getService('testSubjects');

  describe('Dashboard Reporting Screenshots', () => {
    before('initialize tests', async () => {
      log.debug('ReportingPage:initTests');
      await esArchiver.loadIfNeeded('reporting/ecommerce');
      await esArchiver.loadIfNeeded('reporting/ecommerce_kibana');
      await browser.setWindowSize(1600, 850);
    });
    after('clean up archives', async () => {
      await esArchiver.unload('reporting/ecommerce');
      await esArchiver.unload('reporting/ecommerce_kibana');
      await es.deleteByQuery({
        index: '.reporting-*',
        refresh: true,
        body: { query: { match_all: {} } },
      });
    });

    describe('Print PDF button', () => {
      it('is not available if new', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
        await (await testSubjects.find('kibanaChrome')).clickMouseButton(); // close popover
      });

      it('becomes available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PDF Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('Print Layout', () => {
      it('downloads a PDF file', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
        // function is taking about 15 seconds per comparison in jenkins.
        this.timeout(300000);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.checkUsePrintLayout();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');

        /* Check the value of the PDF data that was generated
         * PDF files include dynamic meta info such as creation date.
         * This checks only the first few thousand bytes of the Buffer
         */
        const pdfStrings = (res.body as Buffer).toString('utf8', 14); // start on byte 14 to skip non-utf8 data
        const [header, , contents, , info] = pdfStrings.split('stream'); // ignore everthing from `stream` to `endstream` - the non-utf8 blocks

        // PDF Header

        expectSnapshot(header).toMatchInline(`
          "
          13 0 obj
          <<
          /Predictor 15
          /Colors 1
          /BitsPerComponent 8
          /Columns 577
          >>
          endobj
          14 0 obj
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
          18 0 obj
          <<
          /Type /ExtGState
          /ca 1
          /CA 1
          >>
          endobj
          17 0 obj
          <<
          /Type /Page
          /Parent 1 0 R
          /MediaBox [0 0 595.28 841.89]
          /Contents 15 0 R
          /Resources 16 0 R
          >>
          endobj
          16 0 obj
          <<
          /ProcSet [/PDF /Text /ImageB /ImageC /ImageI]
          /ExtGState <<
          /Gs1 18 0 R
          >>
          /Font <<
          /F1 19 0 R
          /F2 20 0 R
          >>
          /XObject <<
          /I1 5 0 R
          /I2 6 0 R
          /I8 12 0 R
          >>
          >>
          endobj
          15 0 obj
          <<
          /Length 565
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
          23 0 obj
          <<
          /Type /Page
          /Parent 1 0 R
          /MediaBox [0 0 595.28 841.89]
          /Contents 21 0 R
          /Resources 22 0 R
          >>
          endobj
          22 0 obj
          <<
          /ProcSet [/PDF /Text /ImageB /ImageC /ImageI]
          /ExtGState <<
          /Gs1 18 0 R
          >>
          /Font <<
          /F1 19 0 R
          /F2 20 0 R
          >>
          /XObject <<
          /I3 7 0 R
          /I4 8 0 R
          /I8 12 0 R
          >>
          >>
          endobj
          21 0 obj
          <<
          /Length 559
          /Filter /FlateDecode
          >>
          "
        `);
      });
    });

    describe('Print PNG button', () => {
      it('is not available if new', async () => {
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.clickNewDashboard();
        await PageObjects.reporting.openPngReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be('true');
        await (await testSubjects.find('kibanaChrome')).clickMouseButton(); // close popover
      });

      it('becomes available when saved', async () => {
        await PageObjects.dashboard.saveDashboard('My PNG Dash');
        await PageObjects.reporting.openPngReportingPanel();
        expect(await PageObjects.reporting.isGenerateReportButtonDisabled()).to.be(null);
      });
    });

    describe('PNG Layout', () => {
      it('downloads a PNG file', async function () {
        const writeSessionReport = async (name: string, rawPdf: Buffer, reportExt: string) => {
          const sessionDirectory = path.resolve(REPORTS_FOLDER, 'session');
          await mkdirAsync(sessionDirectory, { recursive: true });
          const sessionReportPath = path.resolve(sessionDirectory, `${name}.${reportExt}`);
          await writeFileAsync(sessionReportPath, rawPdf);
          return sessionReportPath;
        };
        const getBaselineReportPath = (fileName: string, reportExt: string) => {
          const baselineFolder = path.resolve(REPORTS_FOLDER, 'baseline');
          const fullPath = path.resolve(baselineFolder, `${fileName}.${reportExt}`);
          log.debug(`getBaselineReportPath (${fullPath})`);
          return fullPath;
        };

        this.timeout(300000);

        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPngReportingPanel();
        await PageObjects.reporting.forceSharedItemsContainerSize({ width: 1405 });
        await PageObjects.reporting.clickGenerateReportButton();
        await PageObjects.reporting.removeForceSharedItemsContainerSize();

        const url = await PageObjects.reporting.getReportURL(60000);
        const reportData = await PageObjects.reporting.getRawPdfReportData(url);
        const reportFileName = 'dashboard_preserve_layout';
        const sessionReportPath = await writeSessionReport(reportFileName, reportData, 'png');
        const percentSimilar = await checkIfPngsMatch(
          sessionReportPath,
          getBaselineReportPath(reportFileName, 'png'),
          config.get('screenshots.directory'),
          log
        );

        expect(percentSimilar).to.be.lessThan(0.1);
      });
    });

    describe('Preserve Layout', () => {
      it('downloads a PDF file', async function () {
        // Generating and then comparing reports can take longer than the default 60s timeout because the comparePngs
        // function is taking about 15 seconds per comparison in jenkins.
        this.timeout(300000);
        await PageObjects.common.navigateToApp('dashboard');
        await PageObjects.dashboard.loadSavedDashboard('Ecom Dashboard');
        await PageObjects.reporting.openPdfReportingPanel();
        await PageObjects.reporting.clickGenerateReportButton();

        const url = await PageObjects.reporting.getReportURL(60000);
        const res = await PageObjects.reporting.getResponse(url);

        expect(res.status).to.equal(200);
        expect(res.get('content-type')).to.equal('application/pdf');

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
          /MediaBox [0 0 1659.333374 1673]
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
          /Font <<
          /F1 13 0 R
          /F2 14 0 R
          >>
          /XObject <<
          /I1 5 0 R
          /I2 6 0 R
          >>
          >>
          endobj
          9 0 obj
          <<
          /Length 516
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
          16 0 obj
          (pdfmake)
          endobj
          17 0 obj
          (pdfmake)
          endobj
          18 0 obj
          (D:DATESTAMP)
          endobj
          15 0 obj
          <<
          /Producer 16 0 R
          /Creator 17 0 R
          /CreationDate 18 0 R
          >>
          endobj
          20 0 obj
          <<
          /Type /FontDescriptor
          /FontName /AZZZZZ+Roboto-Medium
          /Flags 4
          /FontBBox [-732.421875 -270.996094 1192.871094 1047.851563]
          /ItalicAngle 0
          /Ascent 927.734375
          /Descent -244.140625
          /CapHeight 710.9375
          /XHeight 528.320313
          /StemV 0
          /FontFile2 19 0 R
          >>
          endobj
          21 0 obj
          <<
          /Type /Font
          /Subtype /CIDFontType2
          /BaseFont /AZZZZZ+Roboto-Medium
          /CIDSystemInfo <<
          /Registry (Adobe)
          /Ordering (Identity)
          /Supplement 0
          >>
          /FontDescriptor 20 0 R
          /W [0 [510 579.589844 524.902344 566.40625 869.628906 249.023438 672.851563 543.945313 520.019531 566.40625 566.40625 356.445313 566.40625]]
          /CIDToGIDMap /Identity
          >>
          endobj
          22 0 obj
          <<
          /Length 256
          /Filter /FlateDecode
          >>
          "
        `);
      });
    });
  });
}
