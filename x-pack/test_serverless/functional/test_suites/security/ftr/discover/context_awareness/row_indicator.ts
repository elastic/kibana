/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { encode } from '@kbn/rison';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { SECURITY_SOLUTION_DATA_VIEW } from '../../../constants';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const queryBar = getService('queryBar');
  const find = getService('find');

  describe('security document profile', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
    });

    describe('row indicators', () => {
      describe('alerts and events', () => {
        before(async () => {
          await PageObjects.svlCommonPage.loginAsAdmin();
        });

        describe('DataView mode', () => {
          it('should have row indicator for both event and alert', async () => {
            await PageObjects.common.navigateToActualUrl('discover', undefined, {
              ensureCurrentUrl: false,
            });

            await queryBar.clickQuerySubmitButton();
            await PageObjects.discover.waitUntilSearchingHasFinished();

            expect(
              await find.existsByCssSelector(
                '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="alert"]'
              )
            ).to.eql(true);
            expect(
              await find.existsByCssSelector(
                '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="event"]'
              )
            ).to.eql(true);
          });
        });

        describe('ES|QL mode', () => {
          it('should have row indicator for both event and alert', async () => {
            const query = `FROM ${SECURITY_SOLUTION_DATA_VIEW}`;

            const state = encode({
              datasource: { type: 'esql' },
              query: { esql: query },
            });

            await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
              ensureCurrentUrl: false,
            });

            await PageObjects.discover.waitUntilSearchingHasFinished();

            expect(
              await find.existsByCssSelector(
                '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="alert"]'
              )
            ).to.eql(true);
            expect(
              await find.existsByCssSelector(
                '[data-test-subj="unifiedDataTableRowColorIndicatorCell"][title="event"]'
              )
            ).to.eql(true);
          });
        });
      });
    });
  });
}
