/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const transform = getService('transform');

  describe('watcher', () => {
    before(async () => {
      try {
        await transform.testResources.createIndexPatternIfNeeded('ft_ecommerce', 'order_date');
      } catch (error) {
        log.debug('[Setup error] Error creating index pattern');
        throw error;
      }
    });

    after(async () => {
      try {
        await transform.testResources.deleteIndexPatternByTitle('ft_ecommerce');
      } catch (error) {
        log.debug('[Cleanup error] Error deleting index pattern');
        throw error;
      }
    });

    describe('POST /api/watcher/indices/index_patterns', () => {
      it('returns list of index patterns', async () => {
        const response = await supertest
          .get('/api/watcher/indices/index_patterns')
          .set('kbn-xsrf', 'kibana')
          .expect(200);

        expect(response.body).to.contain('ft_ecommerce');
      });
    });
  });
}
