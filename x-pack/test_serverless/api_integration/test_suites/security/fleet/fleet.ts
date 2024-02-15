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
  const retry = getService('retry');

  const defaultFleetServerHostId = 'default-fleet-server';
  const defaultFleetServerHostUrl = 'https://localhost:8220';
  const defaultElasticsearchOutputId = 'es-default-output';
  const defaultElasticsearchOutputHostUrl = 'https://localhost:9200';

  async function expectDefaultFleetServer() {
    await retry.waitForWithTimeout('get default fleet server', 30_000, async () => {
      const { body, status } = await supertest.get(
        `/api/fleet/fleet_server_hosts/${defaultFleetServerHostId}`
      );
      if (status === 200 && body.item.host_urls.includes(defaultFleetServerHostUrl)) {
        return true;
      } else {
        throw new Error(`Expected default Fleet Server id ${defaultFleetServerHostId} to exist`);
      }
    });
  }

  async function expectDefaultElasticsearchOutput() {
    await retry.waitForWithTimeout('get default Elasticsearch output', 30_000, async () => {
      const { body, status } = await supertest.get(
        `/api/fleet/outputs/${defaultElasticsearchOutputId}`
      );
      if (status === 200 && body.item.hosts.includes(defaultElasticsearchOutputHostUrl)) {
        return true;
      } else {
        throw new Error(
          `Expected default Elasticsearch output id ${defaultElasticsearchOutputId} to exist`
        );
      }
    });
  }

  // FLAKY: https://github.com/elastic/kibana/issues/176754
  describe.skip('fleet', function () {
    it('rejects request to create a new fleet server hosts if host url is different from default', async () => {
      await expectDefaultFleetServer();

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
        message: `Fleet server host must have default URL in serverless: ${defaultFleetServerHostUrl}`,
      });
      expect(status).toBe(403);
    });

    it('accepts request to create a new fleet server hosts if host url is same as default', async () => {
      await expectDefaultFleetServer();

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
          host_urls: [defaultFleetServerHostUrl],
        }),
      });
      expect(status).toBe(200);
    });

    it('rejects request to create a new elasticsearch output if host is different from default', async () => {
      await expectDefaultElasticsearchOutput();

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
        message: `Elasticsearch output host must have default URL in serverless: ${defaultElasticsearchOutputHostUrl}`,
      });
      expect(status).toBe(400);
    });

    it('accepts request to create a new elasticsearch output if host url is same as default', async () => {
      await expectDefaultElasticsearchOutput();

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
          hosts: [defaultElasticsearchOutputHostUrl],
        }),
      });
      expect(status).toBe(200);
    });
  });
}
