/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getDiscoverESQLState } from './utils';
import { SECURITY_SOLUTION_DATA_VIEW } from '../../../constants';

const defaultEventColumns = [
  '@timestamp',
  'kibana.alert.workflow_status',
  'message',
  'event.category',
  'event.action',
  'host.name',
  'source.ip',
  'destination.ip',
  'user.name',
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover', 'svlCommonPage']);
  const queryBar = getService('queryBar');
  const retry = getService('retry');

  describe('default State', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('platform_engineer');
      // creates security data view if it does not exist
      await PageObjects.common.navigateToApp('security', {
        path: 'alerts',
      });
    });

    describe('ES|QL mode', () => {
      it('should have correct list of columns', async () => {
        const state = getDiscoverESQLState();
        await PageObjects.common.navigateToActualUrl('discover', `?_a=${state}`, {
          ensureCurrentUrl: false,
        });
        await PageObjects.discover.waitUntilSearchingHasFinished();

        await retry.try(async () => {
          expect((await PageObjects.discover.getColumnHeaders()).join(', ')).to.be(
            defaultEventColumns.join(', ')
          );
        });
      });
    });

    describe('DataView mode', () => {
      it('should have correct list of columns', async () => {
        await PageObjects.common.navigateToActualUrl('discover', undefined, {
          ensureCurrentUrl: false,
        });

        await PageObjects.discover.selectIndexPattern(SECURITY_SOLUTION_DATA_VIEW);

        await queryBar.clickQuerySubmitButton();
        await PageObjects.discover.waitUntilSearchingHasFinished();
        expect((await PageObjects.discover.getColumnHeaders()).join(', ')).to.be(
          defaultEventColumns.join(', ')
        );
      });
    });
  });
}
