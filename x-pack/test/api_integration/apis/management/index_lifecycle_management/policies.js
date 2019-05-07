/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { registerHelpers as registerPoliciesHelpers } from './policies.helpers';
import { registerHelpers as registerIndexHelpers } from './indices.helpers';
import { getPolicyPayload } from './fixtures';
import { initElasticsearchHelpers, getPolicyNames } from './lib';
import { DEFAULT_POLICY_NAME } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const es = getService('es');

  const {
    createIndex,
    cleanUp: cleanUpEsResources
  } = initElasticsearchHelpers(es);

  const {
    loadPolicies,
    createPolicy,
    deletePolicy,
    cleanUp: cleanUpPolicies,
  } = registerPoliciesHelpers({ supertest });

  const { addPolicyToIndex } = registerIndexHelpers({ supertest });

  describe('policies', () => {
    after(() => Promise.all([cleanUpEsResources(), cleanUpPolicies()]));

    describe('list', () => {
      it('should have a default policy to manage the Watcher history indices', async () => {
        const { body } = await loadPolicies().expect(200);
        const [policy = {}] = body;

        // We manually set the date for deterministic test
        const modifiedDate = '2019-04-30T14:30:00.000Z';
        policy.modified_date = modifiedDate;

        expect(policy).to.eql({
          version: 1,
          modified_date: modifiedDate,
          policy: {
            phases: {
              delete: {
                min_age: '7d',
                actions: {
                  delete: {}
                }
              }
            }
          },
          name: DEFAULT_POLICY_NAME
        });
      });

      it('should add the indices linked to the policies', async () => {
        // Create a policy
        const policy = getPolicyPayload();
        const { name: policyName } = policy;
        await createPolicy(policy);

        // Create a new index
        const indexName = await createIndex();

        await addPolicyToIndex(policyName, indexName);

        const { body } = await loadPolicies(true);
        const fetchedPolicy = body.find(p => p.name === policyName);
        expect(fetchedPolicy.linkedIndices).to.eql([indexName]);
      });
    });

    describe('create', () => {
      it('should create a lifecycle policy', async () => {
        const policy = getPolicyPayload();
        const { name } = policy;

        // Load current policies
        const { body: bodyFirstLoad } = await loadPolicies();
        expect(getPolicyNames(bodyFirstLoad)).not.to.contain(name);

        // Create new policy
        await createPolicy(policy).expect(200);

        // Make sure the new policy is returned
        const { body: bodySecondLoad } = await loadPolicies();
        expect(getPolicyNames(bodySecondLoad)).to.contain(name);
      });
    });

    describe('delete', () => {
      it('should delete the policy created', async () => {
        const policy = getPolicyPayload();
        const { name } = policy;

        // Create new policy
        await createPolicy(policy);

        const { body: bodyFirstLoad } = await loadPolicies();
        expect(getPolicyNames(bodyFirstLoad)).to.contain(name);

        // Delete the policy
        await deletePolicy(name).expect(200);

        // Load current policies
        const { body: bodySecondLoad } = await loadPolicies();
        expect(getPolicyNames(bodySecondLoad)).not.to.contain(name);
      });
    });
  });
}
