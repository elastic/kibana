/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';


export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}): : FtrProviderContext & { updateBaselines: boolean }) {
  const testSubjects = getService('testSubjects');
  const screenshot = getService('screenshots');
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'unauthenticatedPage']);

    describe('navigate to the unauthenticated Page', function () {
      before(async function () {
        await PageObjects.common.navigateToUrl('home', '/some/url?some-query=some-value#some-hash', {
          useActualUrl: true,
        });
      it('check unauthenticaed page', function () {
        before(async function () {
          await PageObjects.common.sleep(2000);
          await PageObjects.common.dismissBanner();
          await PageObjects.unauthenticatedPage.waitForRenderComplete();
          await PageObjects.common.sleep(2000);
          await browser.setScreenshotSize(1000, 1337);
          await PageObjects.common.sleep(2000);
        });
      });
      it('unauthenticatedPage overview should match snapshot', async function () {
        try {
          const percentDifference = await screenshot.compareAgainstBaseline(
            'unauthenticated_page',
            --updateBaselines
          );
          expect(percentDifference).to.be.lessThan(0.01);
        } finally {
          log.debug('### Screenshot taken');
        }
      });
    });
  });
}
