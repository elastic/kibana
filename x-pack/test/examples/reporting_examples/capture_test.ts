/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import path from 'path';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'reporting']);
  const compareImages = getService('compareImages');
  const testSubjects = getService('testSubjects');

  const appId = 'reportingExample';

  const fixtures = {
    baselineAPng: path.resolve(__dirname, 'fixtures/baseline/capture_a.png'),
    baselineAPdf: path.resolve(__dirname, 'fixtures/baseline/capture_a.pdf'),
    baselineAPdfPrint: path.resolve(__dirname, 'fixtures/baseline/capture_a_print.pdf'),
  };

  describe('Captures', () => {
    it('PNG that matches the baseline', async () => {
      await PageObjects.common.navigateToApp(appId);

      await (await testSubjects.find('shareButton')).click();
      await (await testSubjects.find('captureTestPanel')).click();
      await (await testSubjects.find('captureTestPNG')).click();

      await PageObjects.reporting.clickGenerateReportButton();
      const url = await PageObjects.reporting.getReportURL(60000);
      const captureData = await PageObjects.reporting.getRawPdfReportData(url);

      const pngSessionFilePath = await compareImages.writeToSessionFile(
        'capture_test_baseline_a',
        captureData
      );

      expect(
        await compareImages.checkIfPngsMatch(pngSessionFilePath, fixtures.baselineAPng)
      ).to.be.lessThan(0.09);
    });
  });
}
