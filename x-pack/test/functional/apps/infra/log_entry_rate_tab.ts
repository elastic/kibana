/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const { logEntryRatePage } = getService('logsUi');
  const retry = getService('retry');

  describe('Log Entry Rate Tab', function() {
    this.tags('smoke');

    describe('with a basic license', () => {
      it('is visible', async () => {
        await logEntryRatePage.navigateTo();

        await retry.try(async () => {
          expect(await logEntryRatePage.getSetupScreen()).to.be.ok();
        });
      });
    });
  });
};
