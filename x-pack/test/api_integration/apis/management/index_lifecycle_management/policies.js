/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { registerHelpers as registerPoliciesHelpers } from './policies.helpers';
import { registerHelpers as registerIndexHelpers } from './indices.helpers';
import { getPolicyPayload } from './fixtures';
import { initElasticsearchHelpers, getPolicyNames } from './lib';
import { DEFAULT_POLICY_NAME } from './constants';

export default function ({ getService }) {
  const supertest = getService('supertest');

  const {
    createIndex,
    createComposableIndexTemplate,
    createDataStream,
    cleanUp: cleanUpEsResources,
  } = initElasticsearchHelpers(getService);

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
        const policy = body.find((policy) => policy.name === DEFAULT_POLICY_NAME);

        // We manually set the date for deterministic test
        const modifiedDate = '2019-04-30T14:30:00.000Z';
        policy.modified_date = modifiedDate;

        expect(policy).to.eql({
          version: 1,
          modified_date: modifiedDate,
          policy: {
            _meta: {
              description: 'default policy for the watcher history indices',
              managed: true,
            },
            phases: {
              delete: {
                min_age: '7d',
                actions: {
                  delete: {
                    delete_searchable_snapshot: true,
                  },
                },
              },
            },
          },
          name: DEFAULT_POLICY_NAME,
        });
      });

      it('should add the indices linked to the policies', async () => {
        // Create a policy
        const policy = getPolicyPayload('link-test-policy');
        const { name: policyName } = policy;
        await createPolicy(policy);

        // Create a new index
        const indexName = await createIndex();

        await addPolicyToIndex(policyName, indexName);

        const { body } = await loadPolicies(true);
        const fetchedPolicy = body.find((p) => p.name === policyName);
        expect(fetchedPolicy.linkedIndices).to.eql([indexName]);
      });

      it('should add hidden indices linked to policies', async () => {
        // Create a policy
        const policy = getPolicyPayload('hidden-index-link-test-policy');
        const { name: policyName } = policy;
        await createPolicy(policy);

        // Create hidden data stream
        await createComposableIndexTemplate('my_template', {
          template: {},
          index_patterns: ['hidden*'],
          data_stream: {
            hidden: true,
          },
        });

        const indexName = 'hidden_index';
        await createDataStream(indexName, {
          '@timestamp': '2020-01-27',
        });

        await addPolicyToIndex(policyName, indexName);

        const { body } = await loadPolicies(true);
        const fetchedPolicy = body.find((p) => p.name === policyName);
        // The index name is dynamically generated as .ds-<indexName>-XXX so we don't check for exact match
        expect(fetchedPolicy.linkedIndices[0]).to.contain(indexName);
      });
    });

    describe('create', () => {
      it('should create a lifecycle policy', async () => {
        const policy = getPolicyPayload('create-test-policy');
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
        const policy = getPolicyPayload('delete-test-policy');
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
