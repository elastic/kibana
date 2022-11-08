/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'header', 'home', 'discover', 'timePicker']);

  describe('upgrade discover smoke tests', function describeIndexTests() {
    const spaces = [
      { space: 'default', basePath: '' },
      { space: 'automation', basePath: 's/automation' },
    ];

    const discoverTests = [
      { name: 'kibana_sample_data_flights', timefield: true, hits: '' },
      { name: 'kibana_sample_data_logs', timefield: true, hits: '' },
      { name: 'kibana_sample_data_ecommerce', timefield: true, hits: '' },
    ];

    spaces.forEach(({ space, basePath }) => {
      discoverTests.forEach(({ name, timefield, hits }) => {
        describe('space: ' + space + ', name: ' + name, () => {
          before(async () => {
            await PageObjects.common.navigateToApp('discover', {
              basePath,
            });
            await PageObjects.header.waitUntilLoadingHasFinished();
            await PageObjects.discover.selectIndexPattern(name);
            await PageObjects.discover.waitUntilSearchingHasFinished();
            if (timefield) {
              await PageObjects.timePicker.setCommonlyUsedTime('Last_24 hours');
              await PageObjects.discover.waitUntilSearchingHasFinished();
            }
          });
          it('shows hit count greater than zero', async () => {
            const hitCount = await PageObjects.discover.getHitCount();
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
