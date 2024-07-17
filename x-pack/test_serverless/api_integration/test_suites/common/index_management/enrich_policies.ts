/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const svlEnrichPoliciesApi = getService('svlEnrichPoliciesApi');
  const svlEnrichPoliciesHelpers = getService('svlEnrichPoliciesHelpers');
  let roleAuthc: RoleCredentials;

  describe('Enrich policies', function () {
    const INDEX_NAME = `index-${Math.random()}`;
    const POLICY_NAME = `policy-${Math.random()}`;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');

      try {
        await svlEnrichPoliciesHelpers.createIndex(INDEX_NAME);
        await svlEnrichPoliciesHelpers.createEnrichPolicy(POLICY_NAME, INDEX_NAME);
      } catch (err) {
        log.debug('[Setup error] Error creating test index and policy');
        throw err;
      }
    });

    after(async () => {
      try {
        await svlEnrichPoliciesHelpers.deleteIndex(INDEX_NAME);
      } catch (err) {
        log.debug('[Cleanup error] Error deleting test index');
        throw err;
      }
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should list all policies', async () => {
      const { status, body } = await svlEnrichPoliciesApi.getAllEnrichPolicies(roleAuthc);

      svlCommonApi.assertResponseStatusCode(200, status, body);

      expect(body).toContainEqual({
        enrichFields: ['firstName'],
        matchField: 'email',
        name: POLICY_NAME,
        sourceIndices: [INDEX_NAME],
        type: 'match',
      });
    });

    it('should be able to execute a policy', async () => {
      const { status, body } = await svlEnrichPoliciesApi.executeEnrichPolicy(
        POLICY_NAME,
        roleAuthc
      );

      svlCommonApi.assertResponseStatusCode(200, status, body);

      // Wait for a little bit for the policy to be executed, so that it can
      // be deleted in the next test.
      await new Promise((resolve) => setTimeout(resolve, 2000));
    });

    it('should be able to delete a policy', async () => {
      const { status } = await svlEnrichPoliciesApi.removeEnrichPolicy(POLICY_NAME, roleAuthc);

      // In the odd case that the policy is somehow still being executed, the delete
      // method might return a 429 so we need to account for that.
      expect([200, 429]).toContain(status);
    });
  });
}
