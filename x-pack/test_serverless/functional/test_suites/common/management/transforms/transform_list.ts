/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const transform = getService('transform');

  describe('Transform List', function () {
    before(async () => {
      await security.testUser.setRoles(['transform_user']);
      await pageObjects.svlCommonPage.login();

      // For this test to work, make sure there are no pre-existing transform present.
      // For example, solutions might set up transforms automatically.
      await transform.api.cleanTransformIndices();
    });

    it('renders the transform list', async () => {
      await transform.testExecution.logTestStep('should load the Transform list page');
      await transform.navigation.navigateTo();
      await transform.management.assertTransformListPageExists();

      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/transform`);

      await transform.testExecution.logTestStep('should display the stats bar');
      await transform.management.assertTransformStatsBarExists();

      await transform.testExecution.logTestStep('should display the "No transforms found" message');
      await transform.management.assertNoTransformsFoundMessageExists();

      await transform.testExecution.logTestStep(
        'should display a disabled "Create first transform" button'
      );
      await transform.management.assertCreateFirstTransformButtonExists();
      await transform.management.assertCreateFirstTransformButtonEnabled(true);
    });
  });
};
