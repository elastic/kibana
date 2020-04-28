/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['header', 'common', 'visualize']);
  const log = getService('log');
  const visName1 = 'Connections over time';
  const screenshot = getService('screenshots');
  describe('reporting app', () => {
    before(async () => {
      log.debug('navigateToApp visualize');
      await PageObjects.common.navigateToApp('visualize', { insertTimestamp: false });
      await PageObjects.visualize.openSavedVisualization(visName1);
      await PageObjects.common.sleep(3000);
    });

    it('should show toast messages when report is queued', async () => {
      const reportQueued =
        'Reporting: Visualization generation has been queued. You can track its progress under Management.';
      log.debug('click Reporting button');
      await PageObjects.header.clickReporting();
      // PageObjects.common.saveScreenshot('Reportingstep-1');
      log.debug('click Printable PDF');
      await PageObjects.header.clickPrintablePdf();
      // PageObjects.common.saveScreenshot('Reporting-step-2');
      const message1 = await PageObjects.header.getToastMessage();
      expect(message1).to.be(reportQueued);
      await PageObjects.header.waitForToastMessageGone();
    });
    screenshot.take('Reporting-step-4');
  });

  it('Management - Reporting - click the button should download the PDF', () => {
    let windowHandles;
    return PageObjects.settings
      .clickDownloadPdf()
      .then(() => {
        return PageObjects.common.sleep(5000);
      })
      .then(() => {
        return this.remote.getAllWindowHandles();
      })
      .then(handles => {
        windowHandles = handles;
        this.remote.switchToWindow(windowHandles[1]);
      })
      .then(() => {
        this.remote.getCurrentWindowHandle();
      })
      .then(() => {
        PageObjects.common.saveScreenshot('Reporting-PDF');
      })
      .then(() => {
        return this.remote.getCurrentUrl();
      })
      .then(url => {
        PageObjects.common.debug('URL = ' + url);
        expect(url).to.contain('/jobs/download/');
      });
  });
}
