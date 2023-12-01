/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const INTERNAL_API_BASE_PATH = '/internal/index_management';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('Enrich policies', function () {
    const INDEX_NAME = `index-${Math.random()}`;

    before(async () => {
      try {
        await es.indices.create({
          index: INDEX_NAME,
          body: {
            mappings: {
              properties: {
                email: {
                  type: 'text',
                },
                firstName: {
                  type: 'text',
                },
              },
            },
          },
        });
      } catch (err) {
        log.debug('[Setup error] Error creating test index and policy');
        throw err;
      }
    });

    after(async () => {
      try {
        await es.indices.delete({ index: INDEX_NAME });
      } catch (err) {
        log.debug('[Cleanup error] Error deleting test index and policy');
        throw err;
      }
    });

    describe('List policies', async () => {
      const POLICY_NAME = `policy-${Math.random()}`;

      before(async () => {
        try {
          // create enrich policy
          await es.enrich.putPolicy({
            name: POLICY_NAME,
            match: {
              match_field: 'email',
              enrich_fields: ['firstName'],
              indices: [INDEX_NAME],
            },
          });
        } catch (err) {
          log.debug('[Cleanup error] Error deleting test index and policy');
          throw err;
        }
      });

      after(async () => {
        try {
          await es.enrich.deletePolicy({ name: POLICY_NAME });
        } catch (err) {
          log.debug('[Cleanup error] Error deleting test index and policy');
          throw err;
        }
      });

      it('should return all policies', async () => {
        const { body } = await supertest
          .get(`${INTERNAL_API_BASE_PATH}/enrich_policies`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        expect(body).toStrictEqual([{
          enrichFields: ['firstName'],
          matchField: 'email',
          name: POLICY_NAME,
          sourceIndices: [INDEX_NAME],
          type: 'match',
        }]);
      });
    });

    describe('Execute policy', () => {
      const POLICY_NAME = `policy-${Math.random()}`;

      before(async () => {
        try {
          // create enrich policy
          await es.enrich.putPolicy({
            name: POLICY_NAME,
            match: {
              match_field: 'email',
              enrich_fields: ['firstName'],
              indices: [INDEX_NAME],
            },
          });
        } catch (err) {
          log.debug('[Cleanup error] Error deleting test index and policy');
          throw err;
        }
      });

      after(async () => {
        try {
          await es.enrich.deletePolicy({ name: POLICY_NAME });
        } catch (err) {
          log.debug('[Cleanup error] Error deleting test policy');
        }
      });

      it('should be able to execute a policy', async () => {
        await supertest
          .put(`${INTERNAL_API_BASE_PATH}/enrich_policies/${POLICY_NAME}`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);
        // const { body } = await supertest
          // .delete(`${INTERNAL_API_BASE_PATH}/enrich_policies/${POLICY_NAME}`)
          // .set('kbn-xsrf', 'xxx')
          // .set('x-elastic-internal-origin', 'xxx')
          // .expect(200);

        // expect(body).toStrictEqual({ 'acknowledged': true });
      });
    });



    it.skip('should be able to delete a policy', async () => {
      const { body } = await supertest
        .delete(`${INTERNAL_API_BASE_PATH}/enrich_policies/${POLICY_NAME}`)
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'xxx')
        .expect(200);

      expect(body).toStrictEqual({ 'acknowledged': true });
    });
  });
}
