/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { API_BASE_PATH, Index } from '@kbn/index-management-plugin/common';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { sortedExpectedIndexKeys } from '../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const createIndex = async (name: string) => {
    await es.indices.create({ index: name });
  };

  const testIndex = 'test_index';
  describe('GET indices without data enrichers', () => {
    before(async () => {
      await createIndex(testIndex);
    });
    after(async () => {
      await esDeleteAllIndices([testIndex]);
    });

    it(`doesn't send ILM, CCR and Rollups requests`, async () => {
      const { body: indices } = await supertest
        .get(`${API_BASE_PATH}/indices`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const index = indices.find((item: Index) => item.name === testIndex);

      const sortedReceivedKeys = Object.keys(index).sort();

      let expectedKeys = [...sortedExpectedIndexKeys];
      // no CCR data enricher
      expectedKeys = expectedKeys.filter((item) => item !== 'isFollowerIndex');
      // no ILM data enricher
      expectedKeys = expectedKeys.filter((item) => item !== 'ilm');
      // no Rollups data enricher
      expectedKeys = expectedKeys.filter((item) => item !== 'isRollupIndex');
      expect(sortedReceivedKeys).to.eql(expectedKeys);
    });
  });
}
