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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('Transform List', function () {
    before(async () => {
      await security.testUser.setRoles(['transform_user']);
      await pageObjects.svlCommonPage.loginAsAdmin();

      // Load logstash* data and create dataview for logstash*, logstash-2015.09.22
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/visualize/default'
      );

      // For this test to work, make sure there are no pre-existing transform present.
      // For example, solutions might set up transforms automatically.
      await transform.api.cleanTransformIndices();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.cleanStandardList();
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
        'should display an enabled "Create first transform" button'
      );
      await transform.management.assertCreateFirstTransformButtonExists();
      await transform.management.assertCreateFirstTransformButtonEnabled(true);
    });

    it('opens transform creation wizard', async () => {
      await transform.management.startTransformCreation();
      await transform.sourceSelection.selectSource('logstash-2015.09.22');
      await transform.datePicker.assertUseFullDataButtonVisible(true);
      await transform.datePicker.assertDatePickerDataTierOptionsVisible(false);
    });
  });
};
