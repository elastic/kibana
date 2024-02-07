/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

import { HOSTS_VIEW_PATH } from './constants';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'infraHome', 'header']);

  describe('Header menu', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await pageObjects.svlCommonPage.login();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      await pageObjects.svlCommonPage.forceLogout();
    });

    describe('Alerts dropdown', () => {
      beforeEach(async () => {
        await pageObjects.common.navigateToApp(HOSTS_VIEW_PATH);
        await pageObjects.header.waitUntilLoadingHasFinished();
      });

      it('is hidden', async () => {
        await pageObjects.infraHome.ensureAlertsAndRulesDropdownIsMissing();
      });
    });
  });
};
