/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const policyName = 'testPolicy1';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexLifecycleManagement']);
  const log = getService('log');
  const retry = getService('retry');
  const esClient = getService('es');

  describe('Home page', function () {
    before(async () => {
      await pageObjects.common.navigateToApp('indexLifecycleManagement');
    });
    after(async () => {
      // @ts-expect-error @elastic/elasticsearch DeleteSnapshotLifecycleRequest.policy_id is required
      await esClient.ilm.deleteLifecycle({ policy: policyName });
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
      });

      await retry.waitFor('navigation back to home page.', async () => {
        return (
          (await pageObjects.indexLifecycleManagement.pageHeaderText()) ===
          'Index Lifecycle Policies'
        );
      });

      await pageObjects.indexLifecycleManagement.increasePolicyListPageSize();

      const allPolicies = await pageObjects.indexLifecycleManagement.getPolicyList();

      const filteredPolicies = allPolicies.filter(function (policy) {
        return policy.name === policyName;
      });

      expect(filteredPolicies.length).to.be(1);
    });
  });
};
