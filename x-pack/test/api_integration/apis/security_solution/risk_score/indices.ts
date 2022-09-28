/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  RISK_SCORE_CREATE_INDEX,
  RISK_SCORE_DELETE_INDICES,
} from '@kbn/security-solution-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { creatIndexOptions } from './mocks';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Indices', () => {
    it('create index', async () => {
      await supertest
        .post(RISK_SCORE_DELETE_INDICES)
        .set('kbn-xsrf', 'true')
        .send({
          indices: ['test'],
        });

      const response = await supertest
        .put(RISK_SCORE_CREATE_INDEX)
        .set('kbn-xsrf', 'true')
        .send(creatIndexOptions);

      expect(response.status).to.be(200);
      expect(response.text).to.be(JSON.stringify(creatIndexOptions));
    });

    it('delete index', async () => {
      const response = await supertest
        .post(RISK_SCORE_DELETE_INDICES)
        .set('kbn-xsrf', 'true')
        .send({
          indices: ['test'],
        });

      expect(response.status).to.be(200);
      expect(response.text).to.be('{"deleted":["test"]}');
    });
  });
}
