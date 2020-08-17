/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['trustedApps']);
  const testSubjects = getService('testSubjects');

  describe('endpoint list', function () {
    this.tags('ciGroup7');

    describe('when there is data', () => {
      before(async () => {
        await pageObjects.trustedApps.navigateToTrustedAppsList();
      });

      it('finds page title', async () => {
        expect(await testSubjects.getVisibleText('header-page-title')).to.equal(
          'Trusted applications BETA'
        );
      });
    });
  });
};
