/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const logsUi = getService('logsUi');
  const retry = getService('retry');
  const esArchiver = getService('esArchiver');

  describe('Log Entry Rate Tab', function () {
    this.tags('includeFirefox');

    describe('with a trial license', () => {
      it('Shows no data page when indices do not exist', async () => {
        await logsUi.logEntryRatePage.navigateTo();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getNoDataScreen()).to.be.ok();
        });
      });

      it('shows setup page when indices exist', async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/simple_logs');
        await logsUi.logEntryRatePage.navigateTo();

        await retry.try(async () => {
          expect(await logsUi.logEntryRatePage.getSetupScreen()).to.be.ok();
        });
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/simple_logs');
      });
    });
  });
};
