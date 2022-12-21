/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'header', 'home']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('canvas smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const canvasTests = [
      { name: 'flights', page: 1, numElements: 35 },
      { name: 'logs', page: 1, numElements: 57 },
      { name: 'ecommerce', page: 1, numElements: 16 },
      { name: 'ecommerce', page: 2, numElements: 9 },
    ];

    spaces.forEach(({ space, basePath }) => {
      describe('space ' + space, () => {
        beforeEach(async () => {
          await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
            basePath,
          });
          await PageObjects.header.waitUntilLoadingHasFinished();
        });
        canvasTests.forEach(({ name, numElements, page }) => {
          it('renders elements on workpad ' + name + ' page ' + page, async () => {
            await PageObjects.home.launchSampleCanvas(name);
            await PageObjects.header.waitUntilLoadingHasFinished();
            const currentUrl = await browser.getCurrentUrl();
            const [, hash] = currentUrl.split('#/');
            if (hash.length === 0) {
              throw new Error('Did not launch canvas sample data for ' + name);
            }
            if (name === 'ecommerce') {
              if (!currentUrl.includes('page/' + page)) {
                await browser.get(currentUrl.replace(/\/[^\/]*$/, '/' + page), false);
                await PageObjects.header.waitUntilLoadingHasFinished();
              }
            }
            await retry.try(async () => {
              const elements = await testSubjects.findAll(
                'canvasWorkpadPage > canvasWorkpadPageElementContent'
              );
              expect(elements).to.have.length(numElements);
            });
          });
        });
      });
    });
  });
}
