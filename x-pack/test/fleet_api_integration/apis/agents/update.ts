/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('fleet_agents_update', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    it('should return a 200 if this a valid update request with tags', async () => {
      const { body: apiResponse } = await supertest
        .put(`/api/fleet/agents/agent1`)
        .set('kbn-xsrf', 'xx')
        .send({
          tags: ['tag1'],
        })
        .expect(200);

      expect(apiResponse.item.tags).to.eql(['tag1']);
    });

    it('should dedupe tags in agent update', async () => {
      const { body: apiResponse } = await supertest
        .put(`/api/fleet/agents/agent1`)
        .set('kbn-xsrf', 'xx')
        .send({
          tags: ['tag1', 'tag2', 'tag1'],
        })
        .expect(200);

      expect(apiResponse.item.tags).to.eql(['tag1', 'tag2']);
    });

    it('should return a 200 if this a valid update request with user metadata', async () => {
      const { body: apiResponse } = await supertest
        .put(`/api/fleet/agents/agent1`)
        .set('kbn-xsrf', 'xx')
        .send({
          user_provided_metadata: {
            data: 'test',
          },
        })
        .expect(200);

      expect(apiResponse.item.user_provided_metadata).to.eql({
        data: 'test',
      });
    });
  });
}
