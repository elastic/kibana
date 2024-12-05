/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/searchprofiler';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Searchprofiler', function () {
    it('Can retrive has indices', async () => {
      const { body } = await supertest.get(`${API_BASE_PATH}/has_indices`).expect(200);
      expect(body).toStrictEqual({ hasIndices: true });
    });
  });
}
