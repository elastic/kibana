/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { registerEsHelpers } from './lib';

const API_BASE_PATH = '/api/snapshot_restore';
const REPO_NAME = 'test_repo';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  const { createRepository, createPolicy, deletePolicy, cleanupPolicies, getPolicy } =
    registerEsHelpers(getService);

  describe('SLM policies', function () {
    this.tags(['skipCloud']); // file system repositories are not supported in cloud

    before(async () => {
      try {
        await createRepository(REPO_NAME);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log('[Setup error] Error creating repository');
        throw err;
      }
    });

    after(async () => {
      await cleanupPolicies();
    });

    describe('Create', () => {
      const POLICY_NAME = 'test_create_policy';
      const REQUIRED_FIELDS_POLICY_NAME = 'test_create_required_fields_policy';

      after(async () => {
        // Clean up any policies created in test cases
        await Promise.all([POLICY_NAME, REQUIRED_FIELDS_POLICY_NAME].map(deletePolicy)).catch(
          (err) => {
            // eslint-disable-next-line no-console
            console.log(`[Cleanup error] Error deleting policies: ${err.message}`);
            throw err;
          }
        );
      });

      it('should create a SLM policy', async () => {
        const { body } = await supertest
          .post(`${API_BASE_PATH}/policies`)
          .set('kbn-xsrf', 'xxx')
          .send({
            name: POLICY_NAME,
            snapshotName: 'my_snapshot',
            schedule: '0 30 1 * * ?',
            repository: REPO_NAME,
            config: {
              indices: ['my_index'],
              ignoreUnavailable: true,
              partial: false,
              metadata: {
                meta: 'my_meta',
              },
            },
            retention: {
              expireAfterValue: 1,
              expireAfterUnit: 'd',
              maxCount: 10,
              minCount: 5,
            },
            isManagedPolicy: false,
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });

        const policyFromEs = await getPolicy(POLICY_NAME);
        expect(policyFromEs[POLICY_NAME]).to.be.ok();
        expect(policyFromEs[POLICY_NAME].policy).to.eql({
          name: 'my_snapshot',
          schedule: '0 30 1 * * ?',
          repository: REPO_NAME,
          config: {
            indices: ['my_index'],
            ignore_unavailable: true,
            partial: false,
            metadata: {
              meta: 'my_meta',
            },
          },
          retention: {
            expire_after: '1d',
            max_count: 10,
            min_count: 5,
          },
        });
      });

      it('should create a policy with only required fields', async () => {
        const { body } = await supertest
          .post(`${API_BASE_PATH}/policies`)
          .set('kbn-xsrf', 'xxx')
          // Exclude config and retention
          .send({
            name: REQUIRED_FIELDS_POLICY_NAME,
            snapshotName: 'my_snapshot',
            repository: REPO_NAME,
            schedule: '0 30 1 * * ?',
            isManagedPolicy: false,
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });

        const policyFromEs = await getPolicy(REQUIRED_FIELDS_POLICY_NAME);
        expect(policyFromEs[REQUIRED_FIELDS_POLICY_NAME]).to.be.ok();
        expect(policyFromEs[REQUIRED_FIELDS_POLICY_NAME].policy).to.eql({
          name: 'my_snapshot',
          repository: REPO_NAME,
          schedule: '0 30 1 * * ?',
        });
      });
    });

    describe('Update', () => {
      const POLICY_NAME = 'test_update_policy';
      const SNAPSHOT_NAME = 'my_snapshot';
      const POLICY = {
        schedule: '0 30 1 * * ?',
        repository: REPO_NAME,
        config: {
          indices: ['my_index'],
          ignoreUnavailable: true,
          partial: false,
          metadata: {
            meta: 'my_meta',
          },
        },
        retention: {
          expireAfterValue: 1,
          expireAfterUnit: 'd',
          maxCount: 10,
          minCount: 5,
        },
        isManagedPolicy: false,
      };

      before(async () => {
        // Create SLM policy that can be used to test PUT request
        try {
          await createPolicy({ ...POLICY, policyName: POLICY_NAME, name: SNAPSHOT_NAME }, true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log('[Setup error] Error creating policy');
          throw err;
        }
      });

      it('should allow an existing policy to be updated', async () => {
        const uri = `${API_BASE_PATH}/policies/${POLICY_NAME}`;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({
            ...POLICY,
            name: POLICY_NAME,
            snapshotName: SNAPSHOT_NAME,
            schedule: '0 0 0 ? * 7',
          })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });

        const policyFromEs = await getPolicy(POLICY_NAME);
        expect(policyFromEs[POLICY_NAME]).to.be.ok();
        expect(policyFromEs[POLICY_NAME].policy).to.eql({
          name: 'my_snapshot',
          schedule: '0 0 0 ? * 7',
          repository: REPO_NAME,
          config: {
            indices: ['my_index'],
            ignore_unavailable: true,
            partial: false,
            metadata: {
              meta: 'my_meta',
            },
          },
          retention: {
            expire_after: '1d',
            max_count: 10,
            min_count: 5,
          },
        });
      });

      it('should allow optional fields to be removed', async () => {
        const uri = `${API_BASE_PATH}/policies/${POLICY_NAME}`;
        const { retention, config, ...requiredFields } = POLICY;

        const { body } = await supertest
          .put(uri)
          .set('kbn-xsrf', 'xxx')
          .send({ ...requiredFields, name: POLICY_NAME, snapshotName: SNAPSHOT_NAME })
          .expect(200);

        expect(body).to.eql({
          acknowledged: true,
        });

        const policyFromEs = await getPolicy(POLICY_NAME);
        expect(policyFromEs[POLICY_NAME]).to.be.ok();
        expect(policyFromEs[POLICY_NAME].policy).to.eql({
          name: 'my_snapshot',
          schedule: '0 30 1 * * ?',
          repository: REPO_NAME,
        });
      });
    });
  });
}
