/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers as registerIndexHelpers } from './indices.helpers';
import { registerHelpers as registerPoliciesHelpers } from './policies.helpers';
import { initElasticsearchIndicesHelpers, getRandomString } from './lib';
import { getPolicyPayload } from './fixtures';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('es');

  const {
    getIndex,
    createIndex,
    cleanUp: cleanUpEsResources
  } = initElasticsearchIndicesHelpers(es);

  const {
    addPolicyToIndex,
    removePolicyFromIndex,
  } = registerIndexHelpers({ supertest });

  const {
    createPolicy,
    cleanUp: cleanUpPolicies,
  } = registerPoliciesHelpers({ supertest });

  describe('indices', () => {
    after(() => Promise.all([cleanUpEsResources(), cleanUpPolicies()]));

    describe('policies', () => {
      it('should add a lifecycle policy to the index', async () => {
        // Create a policy
        const policy = getPolicyPayload();
        const { lifecycle: { name: policyName } } = policy;
        await createPolicy(policy);

        // Create a new index
        const indexName = await createIndex();
        const rolloverAlias = getRandomString();

        await addPolicyToIndex(policyName, indexName, rolloverAlias).expect(200);

        // Fetch the index and verify that the policy has been attached
        const indexFetched = await getIndex(indexName);
        const { settings: { index: { lifecycle } } } = indexFetched[indexName];
        expect(lifecycle.name).to.equal(policyName);
        expect(lifecycle.rollover_alias).to.equal(rolloverAlias);
      });

      it('should remove a lifecycle policy from an index', async () => {
        // Create a policy
        const policy = getPolicyPayload();
        const { lifecycle: { name: policyName } } = policy;
        await createPolicy(policy);

        // Create a new index
        const indexName = await createIndex();
        const rolloverAlias = getRandomString();

        await addPolicyToIndex(policyName, indexName, rolloverAlias);

        // Make sure policy is attached
        let indexFetched = await getIndex(indexName);
        expect(indexFetched[indexName].settings.index.lifecycle.name).to.equal(policyName);

        // Remove policy
        await removePolicyFromIndex(indexName);

        indexFetched = await getIndex(indexName);
        expect(indexFetched[indexName].settings.index.lifecycle).be(undefined);
      });
    });
  });
}
