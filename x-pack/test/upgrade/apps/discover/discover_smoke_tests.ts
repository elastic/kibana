/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'home', 'discover', 'timePicker']);

  describe('upgrade discover smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const discoverTests = [
      { name: 'flights', timefield: true, hits: '' },
      { name: 'logs', timefield: true, hits: '' },
      { name: 'ecommerce', timefield: true, hits: '' },
    ];

    spaces.forEach(({ space, basePath }) => {
      discoverTests.forEach(({ name, timefield, hits }) => {
        describe('space: ' + space + ', name: ' + name, () => {
          before(async () => {
            await PageObjects.common.navigateToApp('discover', {
              basePath,
            });
            await PageObjects.header.waitUntilLoadingHasFinished();
            const indices = await PageObjects.discover.getIndexPatterns();
            const index = indices.find((element) => {
              if (element.toLowerCase().includes(name)) {
                return true;
              }
            });
            await PageObjects.discover.selectIndexPattern(String(index));
            await PageObjects.discover.waitUntilSearchingHasFinished();
            if (timefield) {
              await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
              await PageObjects.discover.waitUntilSearchingHasFinished();
            }
          });
          it('shows hit count greater than zero', async () => {
            const hitCount = await PageObjects.discover.getHitCountInt();
            if (hits === '') {
              expect(hitCount).to.be.greaterThan(0);
            } else {
              expect(hitCount).to.be.equal(hits);
            }
          });
          it('shows table rows not empty', async () => {
            const tableRows = await PageObjects.discover.getDocTableRows();
            expect(tableRows.length).to.be.greaterThan(0);
          });
        });
      });

      discoverTests.forEach(({ name, timefield, hits }) => {
        describe('space: ' + space + ', name: ' + name, () => {
          before(async () => {
            await PageObjects.common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
              basePath,
            });
            await PageObjects.header.waitUntilLoadingHasFinished();
            await PageObjects.home.launchSampleDiscover(name);
            await PageObjects.header.waitUntilLoadingHasFinished();
            if (timefield) {
              await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
              await PageObjects.discover.waitUntilSearchingHasFinished();
            }
          });
          it('shows hit count greater than zero', async () => {
            const hitCount = await PageObjects.discover.getHitCountInt();
            if (hits === '') {
              expect(hitCount).to.be.greaterThan(0);
            } else {
              expect(hitCount).to.be.equal(hits);
            }
          });
          it('shows table rows not empty', async () => {
            const tableRows = await PageObjects.discover.getDocTableRows();
            expect(tableRows.length).to.be.greaterThan(0);
          });
        });
      });
    });
  });
}
