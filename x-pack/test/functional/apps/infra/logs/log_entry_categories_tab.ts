/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const logsUi = getService('logsUi');
  const retry = getService('retry');

  describe('Log Entry Categories Tab', function () {
    this.tags('includeFirefox');

    describe('with a trial license', () => {
      it('Shows no data page when indices do not exist', async () => {
        await logsUi.logEntryCategoriesPage.navigateTo();

        await retry.try(async () => {
          expect(await logsUi.logEntryCategoriesPage.getNoDataScreen()).to.be.ok();
        });
      });

      it('shows setup page when indices exist', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
        await logsUi.logEntryCategoriesPage.navigateTo();

        await retry.try(async () => {
          expect(await logsUi.logEntryCategoriesPage.getSetupScreen()).to.be.ok();
        });
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
      });
    });
  });
};
