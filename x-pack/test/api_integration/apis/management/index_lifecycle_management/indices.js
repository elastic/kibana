/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers as registerIndexHelpers } from './indices.helpers';
import { registerHelpers as registerPoliciesHelpers } from './policies.helpers';
import { initElasticsearchHelpers, getRandomString } from './lib';
import { getPolicyPayload } from './fixtures';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  const {
    getIndex,
    createIndex,
    cleanUp: cleanUpEsResources
  } = initElasticsearchHelpers(es);

  const {
    addPolicyToIndex,
    removePolicyFromIndex,
    retryPolicyOnIndex,
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
        const { name: policyName } = policy;
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
        const { name: policyName } = policy;
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

    describe('index management extension', () => {
      it('should have an endpoint to retry a policy for an index that is in the ERROR step', async () => {
        // Create a policy
        const policy = getPolicyPayload();
        const { name: policyName } = policy;
        await createPolicy(policy);

        // Create a new index
        const indexName = await createIndex();

        await addPolicyToIndex(policyName, indexName);

        // As there is no easy way to set the index in the ERROR state to be able to retry
        // we validate that the error returned *is* coming from the ES "_ilm/retry" endpoint
        const { body } = await retryPolicyOnIndex(indexName);
        const expected = `[illegal_argument_exception] cannot retry an action for an index [${indexName}] that has not encountered an error when running a Lifecycle Policy`;
        expect(body.message).to.be(expected);
      });
    });
  });
}
