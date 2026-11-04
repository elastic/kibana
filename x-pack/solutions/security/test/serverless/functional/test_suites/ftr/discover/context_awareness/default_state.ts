/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIALIZE_SECURITY_SOLUTION_URL } from '@kbn/security-solution-plugin/common/api/initialization';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
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
  const roleScopedSupertest = getService('roleScopedSupertest');

  describe('default State', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('platform_engineer');

      // Create the "Security solution default" data view via the API and await it, so it is a
      // confirmed precondition rather than the unawaited side effect of loading the Security app,
      // which let Discover open before the data view committed and timed out the switcher (#237709).
      const adminSupertest = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        useCookieHeader: true,
        withInternalHeaders: true,
      });
      await adminSupertest
        .post(INITIALIZE_SECURITY_SOLUTION_URL)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .send({ flows: ['security-data-views'] })
        .expect(200);
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
