/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const { common, header, home, discover, timePicker } = getPageObjects([
    'common',
    'header',
    'home',
    'discover',
    'timePicker',
  ]);

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
            await common.navigateToApp('discover', {
              basePath,
            });
            await header.waitUntilLoadingHasFinished();
            const indices = await discover.getIndexPatterns();
            const index = indices.find((element) => {
              if (element.toLowerCase().includes(name)) {
                return true;
              }
            });
            await discover.selectIndexPattern(String(index));
            await discover.waitUntilSearchingHasFinished();
            if (timefield) {
              await timePicker.setCommonlyUsedTime('Last_1 year');
              await discover.waitUntilSearchingHasFinished();
            }
          });
          it('shows hit count greater than zero', async () => {
            const hitCount = await discover.getHitCountInt();
            if (hits === '') {
              expect(hitCount).to.be.greaterThan(0);
            } else {
              expect(hitCount).to.be.equal(hits);
            }
          });
          it('shows table rows not empty', async () => {
            const tableRows = await discover.getDocTableRows();
            expect(tableRows.length).to.be.greaterThan(0);
          });
        });
      });

      discoverTests.forEach(({ name, timefield, hits }) => {
        describe('space: ' + space + ', name: ' + name, () => {
          before(async () => {
            await common.navigateToActualUrl('home', '/tutorial_directory/sampleData', {
              basePath,
            });
            await header.waitUntilLoadingHasFinished();
            await home.launchSampleDiscover(name);
            await header.waitUntilLoadingHasFinished();
            if (timefield) {
              await timePicker.setCommonlyUsedTime('Last_1 year');
              await discover.waitUntilSearchingHasFinished();
            }
          });
          it('shows hit count greater than zero', async () => {
            const hitCount = await discover.getHitCountInt();
            if (hits === '') {
              expect(hitCount).to.be.greaterThan(0);
            } else {
              expect(hitCount).to.be.equal(hits);
            }
          });
          it('shows table rows not empty', async () => {
            const tableRows = await discover.getDocTableRows();
            expect(tableRows.length).to.be.greaterThan(0);
          });
        });
      });
    });
  });
}
