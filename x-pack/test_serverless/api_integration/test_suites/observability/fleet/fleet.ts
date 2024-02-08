/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  // Failing: See https://github.com/elastic/kibana/issues/176352
  describe.skip('fleet', function () {
    it('rejects request to create a new fleet server hosts if host url is different from default', async () => {
      const { body, status } = await supertest
        .post('/api/fleet/fleet_server_hosts')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          name: 'test',
          host_urls: ['https://localhost:8221'],
        });

      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Fleet server host must have default URL in serverless: https://localhost:8220',
      });
      expect(status).toBe(403);
    });

    it('accepts request to create a new fleet server hosts if host url is same as default', async () => {
      const { body, status } = await supertest
        .post('/api/fleet/fleet_server_hosts')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          name: 'Test Fleet server host',
          host_urls: ['https://localhost:8220'],
        });

      expect(body).toEqual({
        item: expect.objectContaining({
          name: 'Test Fleet server host',
          host_urls: ['https://localhost:8220'],
        }),
      });
      expect(status).toBe(200);
    });

    it('rejects request to create a new elasticsearch output if host is different from default', async () => {
      const { body, status } = await supertest
        .post('/api/fleet/outputs')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          name: 'Test output',
          type: 'elasticsearch',
          hosts: ['https://localhost:9201'],
        });

      // in a non-serverless environment this would succeed with a 200
      expect(body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Elasticsearch output host must have default URL in serverless: https://localhost:9200',
      });
      expect(status).toBe(400);
    });

    it('accepts request to create a new elasticsearch output if host url is same as default', async () => {
      const { body, status } = await supertest
        .post('/api/fleet/outputs')
        .set(svlCommonApi.getInternalRequestHeader())
        .send({
          name: 'Test output',
          type: 'elasticsearch',
          hosts: ['https://localhost:9200'],
        });

      expect(body).toEqual({
        item: expect.objectContaining({
          name: 'Test output',
          hosts: ['https://localhost:9200'],
        }),
      });
      expect(status).toBe(200);
    });
  });
}
