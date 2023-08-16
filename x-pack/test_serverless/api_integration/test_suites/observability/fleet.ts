/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('fleet', function () {
    it('rejects request to create a new fleet server hosts', async () => {
      const { body, status } = await supertest
        .post('/api/fleet/fleet_server_hosts')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          name: 'test',
          host_urls: ['https://localhost:8220'],
        });

      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Fleet server host write APIs are disabled',
      });
      expect(status).toBe(403);
    });

    it('rejects request to create a new proxy', async () => {
      const { body, status } = await supertest
        .post('/api/fleet/proxies')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          name: 'test',
          url: 'https://localhost:8220',
        });

      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Proxies write APIs are disabled',
      });
      expect(status).toBe(403);
    });
  });
}
