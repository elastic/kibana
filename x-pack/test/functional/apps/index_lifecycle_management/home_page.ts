/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const policyName = 'testPolicy1';
const repoName = 'found-snapshots'; // this repo already exists on cloud

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexLifecycleManagement']);
  const log = getService('log');
  const retry = getService('retry');
  const esClient = getService('es');
  const security = getService('security');
  const deployment = getService('deployment');

  describe('Home page', function () {
    before(async () => {
      await security.testUser.setRoles(['manage_ilm']);
      const isCloud = await deployment.isCloud();
      if (!isCloud) {
        await esClient.snapshot.createRepository({
          name: repoName,
          body: {
            type: 'fs',
            settings: {
              // use one of the values defined in path.repo in test/functional/config.js
              location: '/tmp/',
            },
          },
          verify: false,
        });
      }

      await pageObjects.common.navigateToApp('indexLifecycleManagement');
    });
    after(async () => {
      const isCloud = await deployment.isCloud();
      if (!isCloud) {
        await esClient.snapshot.deleteRepository({ name: repoName });
      }
      await esClient.ilm.deleteLifecycle({ name: policyName });
      await security.testUser.restoreDefaults();
    });

    it('Loads the app', async () => {
      await log.debug('Checking for page header');
      const headerText = await pageObjects.indexLifecycleManagement.pageHeaderText();
      expect(headerText).to.be('Index Lifecycle Policies');

      const createPolicyButton = await pageObjects.indexLifecycleManagement.createPolicyButton();
      expect(await createPolicyButton.isDisplayed()).to.be(true);
    });

    it('Create new policy with all Phases', async () => {
      await pageObjects.indexLifecycleManagement.createNewPolicyAndSave({
        policyName,
        warmEnabled: true,
        coldEnabled: true,
        frozenEnabled: true,
        deleteEnabled: true,
        snapshotRepository: repoName,
      });

      await retry.waitFor('navigation back to home page.', async () => {
        return (
          (await pageObjects.indexLifecycleManagement.pageHeaderText()) ===
          'Index Lifecycle Policies'
        );
      });

      await pageObjects.indexLifecycleManagement.increasePolicyListPageSize();

      const createdPolicy = await pageObjects.indexLifecycleManagement.getPolicyRow(policyName);

      expect(createdPolicy.length).to.be(1);
    });
  });
};
