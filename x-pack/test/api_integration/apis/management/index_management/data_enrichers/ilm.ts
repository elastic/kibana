/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { API_BASE_PATH, Index } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const createIndex = async (name: string) => {
    await es.indices.create({
      index: name,
      settings: {
        hidden: true,
      },
    });
  };

  const createIlmPolicy = async (policyName: string) => {
    await es.ilm.putLifecycle({
      name: policyName,
      policy: {
        phases: {
          hot: {
            min_age: '1d',
            actions: {
              set_priority: {
                priority: 100,
              },
            },
          },
        },
      },
    });
  };

  const addPolicyToIndex = async (policyName: string, indexName: string, rolloverAlias: string) => {
    await es.indices.putSettings({
      index: indexName,
      settings: {
        lifecycle: {
          name: policyName,
          rollover_alias: rolloverAlias,
        },
      },
    });
  };
  const testIndex = '.test_index';
  const testAlias = 'test_alias';
  const testIlmPolicy = 'test_policy';
  describe('GET indices with data enrichers', async () => {
    before(async () => {
      await createIndex(testIndex);
      await createIlmPolicy('test_policy');
      await addPolicyToIndex(testIlmPolicy, testIndex, testAlias);
    });
    after(async () => {
      await esDeleteAllIndices([testIndex]);
    });

    it(`ILM data is fetched by the ILM data enricher`, async () => {
      const { body: indices } = await supertest
        .get(`${API_BASE_PATH}/indices`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const index = indices.find((item: Index) => item.name === testIndex);

      const { ilm } = index;
      expect(ilm.policy).to.eql(testIlmPolicy);
    });
  });
}
