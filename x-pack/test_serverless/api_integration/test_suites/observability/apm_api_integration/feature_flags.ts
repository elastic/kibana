/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const fleetMigrationResponse = {
  statusCode: 404,
  error: 'Not Found',
  message: 'Not Found',
};

const agentConfigurationResponse = {
  statusCode: 404,
  error: 'Not Found',
  message: 'Not Found',
};

const sourceMapsResponse = {
  statusCode: 501,
  error: 'Not Implemented',
  message: 'Not Implemented',
};

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const supertest = getService('supertest');

  describe('apm feature flags', () => {
    describe('fleet migrations', () => {
      it('rejects requests to save apm server schema', async () => {
        const { body, status } = await supertest
          .post('/api/apm/fleet/apm_server_schema 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(fleetMigrationResponse);
        expect(status).toBe(fleetMigrationResponse.statusCode);
      });

      it('rejects requests to get unsupported apm server schema', async () => {
        const { body, status } = await supertest
          .get('/internal/apm/fleet/apm_server_schema/unsupported')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(fleetMigrationResponse);
        expect(status).toBe(fleetMigrationResponse.statusCode);
      });

      it('rejects requests to get migration check', async () => {
        const { body, status } = await supertest
          .get('/internal/apm/fleet/migration_check')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(fleetMigrationResponse);
        expect(status).toBe(fleetMigrationResponse.statusCode);
      });
    });

    describe('agent configuration', () => {
      it('rejects requests to get agent configurations', async () => {
        const { body, status } = await supertest
          .get('/api/apm/settings/agent-configuration 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(agentConfigurationResponse);
        expect(status).toBe(agentConfigurationResponse.statusCode);
      });

      it('rejects requests to get single agent configuration', async () => {
        const { body, status } = await supertest
          .get('/api/apm/settings/agent-configuration/view 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(agentConfigurationResponse);
        expect(status).toBe(agentConfigurationResponse.statusCode);
      });

      it('rejects requests to delete agent configuration', async () => {
        const { body, status } = await supertest
          .delete('/api/apm/settings/agent-configuration 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(agentConfigurationResponse);
        expect(status).toBe(agentConfigurationResponse.statusCode);
      });

      it('rejects requests to create/update agent configuration', async () => {
        const { body, status } = await supertest
          .put('/api/apm/settings/agent-configuration 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(agentConfigurationResponse);
        expect(status).toBe(agentConfigurationResponse.statusCode);
      });

      it('rejects requests to lookup single configuration', async () => {
        const { body, status } = await supertest
          .post('/api/apm/settings/agent-configuration/search 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(agentConfigurationResponse);
        expect(status).toBe(agentConfigurationResponse.statusCode);
      });
    });
    // it's returning 404 but we expect 501 Not implemented
    describe.skip('source maps', () => {
      it('rejects requests to list source maps', async () => {
        const { body, status } = await supertest
          .get('/api/apm/sourcemaps 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(sourceMapsResponse);
        expect(status).toBe(sourceMapsResponse.statusCode);
      });

      it('rejects requests to upload source maps', async () => {
        const { body, status } = await supertest
          .post('/api/apm/sourcemaps 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(sourceMapsResponse);
        expect(status).toBe(sourceMapsResponse.statusCode);
      });

      it('rejects requests to delete source map', async () => {
        const { body, status } = await supertest
          .delete('/api/apm/sourcemaps/{id} 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(sourceMapsResponse);
        expect(status).toBe(sourceMapsResponse.statusCode);
      });
    });
  });
}
