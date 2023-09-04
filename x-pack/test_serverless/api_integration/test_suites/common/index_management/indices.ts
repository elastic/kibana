/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const API_BASE_PATH = '/api/index_management';
const INTERNAL_API_BASE_PATH = '/internal/index_management';
const expectedKeys = ['aliases', 'hidden', 'isFrozen', 'primary', 'replica', 'name'].sort();

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('Indices', function () {
    const indexName = `index-${Math.random()}`;

    before(async () => {
      // Create a new index to test against
      try {
        await es.indices.create({ index: indexName });
      } catch (err) {
        log.debug('[Setup error] Error creating index');
        throw err;
      }
    });

    after(async () => {
      // Cleanup index created for testing purposes
      try {
        await es.indices.delete({
          index: indexName,
        });
      } catch (err) {
        log.debug('[Cleanup error] Error deleting index');
        throw err;
      }
    });

    describe('get all', () => {
      it('should list indices with the expected parameters', async () => {
        const { body: indices } = await supertest
          .get(`${API_BASE_PATH}/indices`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        const indexFound = indices.find((index: { name: string }) => index.name === indexName);

        expect(indexFound).toBeTruthy();

        expect(Object.keys(indexFound).sort()).toEqual(expectedKeys);
      });
    });

    describe('get index', () => {
      it('returns index details for the specified index name', async () => {
        const { body: index } = await supertest
          .get(`${INTERNAL_API_BASE_PATH}/indices/${indexName}`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(200);

        expect(index).toBeTruthy();

        expect(Object.keys(index).sort()).toEqual(expectedKeys);
      });

      it('throws 404 for a non-existent index', async () => {
        await supertest
          .get(`${INTERNAL_API_BASE_PATH}/indices/non_existent`)
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'xxx')
          .expect(404);
      });
    });
  });
}
