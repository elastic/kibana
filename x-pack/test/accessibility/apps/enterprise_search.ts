/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const { common } = getPageObjects(['common']);

  describe('Enterprise Search', () => {
    // NOTE: These accessibility tests currently only run against Enterprise Search in Kibana
    // without a sidecar Enterprise Search service/host configured, and as such only test
    // the basic setup guides and not the full application(s)
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    describe('Overview', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/overview');
      });

      it('loads a landing page with product cards', async function () {
        await retry.waitFor(
          'AS product card visible',
          async () => await testSubjects.exists('appSearchProductCard')
        );
        await retry.waitFor(
          'WS product card visible',
          async () => await testSubjects.exists('workplaceSearchProductCard')
        );
        await a11y.testAppSnapshot();
      });

      it('loads a setup guide', async function () {
        await testSubjects.click('setupGuideLink');
        await retry.waitFor(
          'setup guide visible',
          async () => await testSubjects.exists('setupGuide')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('App Search', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/app_search');
      });

      it('loads a setup guide', async function () {
        await retry.waitFor(
          'setup guide visible',
          async () => await testSubjects.exists('setupGuide')
        );
        await a11y.testAppSnapshot();
      });
    });

    describe('Workplace Search', () => {
      before(async () => {
        await common.navigateToApp('enterprise_search/workplace_search');
      });

      it('loads a setup guide', async function () {
        await retry.waitFor(
          'setup guide visible',
          async () => await testSubjects.exists('setupGuide')
        );
        await a11y.testAppSnapshot();
      });
    });
  });
}
