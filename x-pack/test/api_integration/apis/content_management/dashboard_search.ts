/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { sampleDashboard } from './helpers';

export default function ({ getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const supertest = getService('supertest');

  describe('search dashboards', function () {
    const createPayload = {
      ...sampleDashboard,
      options: {
        ...sampleDashboard.options,
        references: [
          {
            type: 'tag',
            id: 'tag1',
            name: 'tag-ref-tag1',
          },
          {
            type: 'index-pattern',
            id: 'index-pattern1',
            name: 'index-pattern-ref-index-pattern1',
          },
        ],
      },
    };
    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['dashboard'],
      });

      await supertest
        .post('/api/content_management/rpc/create')
        .set('kbn-xsrf', 'true')
        .send(createPayload)
        .expect(200);
    });

    it('can specify references to return', async () => {
      const searchPayload = {
        contentTypeId: 'dashboard',
        version: 3,
        query: {},
        options: {},
      };

      {
        const { body } = await supertest
          .post('/api/content_management/rpc/search')
          .set('kbn-xsrf', 'true')
          .send(searchPayload)
          .expect(200);

        expect(body.result.result.hits[0].references).to.eql(createPayload.options.references);
      }

      {
        const { body } = await supertest
          .post('/api/content_management/rpc/search')
          .set('kbn-xsrf', 'true')
          .send({ ...searchPayload, options: { includeReferences: ['tag'] } })
          .expect(200);

        expect(body.result.result.hits[0].references).to.eql([createPayload.options.references[0]]);
      }
    });
  });
}
