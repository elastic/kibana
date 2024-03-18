/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

const API_BASE_PATH = '/api/searchprofiler';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Profile', () => {
    it('should return profile results for a valid index', async () => {
      const payload = {
        index: '_all',
        query: {
          query: {
            match_all: {},
          },
        },
      };

      const { body } = await supertest
        .post(`${API_BASE_PATH}/profile`)
        .set('kbn-xsrf', 'xxx')
        .set('Content-Type', 'application/json;charset=UTF-8')
        .send(payload)
        .expect(200);

      expect(body.ok).to.eql(true);
    });

    it('should return error for invalid index', async () => {
      const payloadWithInvalidIndex = {
        index: 'index_does_not_exist',
        query: {
          query: {
            match_all: {},
          },
        },
      };

      const { body } = await supertest
        .post(`${API_BASE_PATH}/profile`)
        .set('kbn-xsrf', 'xxx')
        .set('Content-Type', 'application/json;charset=UTF-8')
        .send(payloadWithInvalidIndex)
        .expect(404);

      expect(body.error).to.eql('Not Found');
    });
  });
}
