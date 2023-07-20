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
  attributes: {
    data: null,
    _inspect: [],
  },
};

const agentConfigurationResponse = {
  statusCode: 404,
  error: 'Not Found',
  message: 'Not Found',
  attributes: {
    data: null,
    _inspect: [],
  },
};

const sourceMapsResponse = {
  statusCode: 501,
  error: 'Not Implemented',
  message: 'Not Implemented',
  attributes: {
    data: null,
    _inspect: [],
  },
};

export default function ({ getService }: FtrProviderContext) {
  const svlCommonApi = getService('svlCommonApi');
  const apmApiClient = getService('apmApiClient');
  const supertest = getService('supertest');

  describe('apm feature flags', () => {
    describe('fleet migrations', () => {
      // TODO: @Miriam - This is a POST request, not a GET. Need to be fixed by adding proper params object. Skipping it for now
      xit('rejects requests to save apm server schema', async () => {
        const { body, status } = await apmApiClient.slsUser({
          endpoint: 'GET /api/apm/fleet/apm_server_schema 2023-10-31',
        });

        expect(body).toEqual(fleetMigrationResponse);
        expect(status).toBe(fleetMigrationResponse.statusCode);
      });

      it('rejects requests to get unsupported apm server schema', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /internal/apm/fleet/apm_server_schema/unsupported',
          });
        } catch (err) {
          expect(err.res.status).toBe(fleetMigrationResponse.statusCode);
          expect(err.res.body).toStrictEqual(fleetMigrationResponse);
        }
      });

      it('rejects requests to get migration check', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /internal/apm/fleet/migration_check',
          });
        } catch (err) {
          expect(err.res.status).toBe(fleetMigrationResponse.statusCode);
          expect(err.res.body).toStrictEqual(fleetMigrationResponse);
        }
      });
    });

    describe('agent configuration', () => {
      it('rejects requests to get agent configurations', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /api/apm/settings/agent-configuration 2023-10-31',
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });

      it('rejects requests to get single agent configuration', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /api/apm/settings/agent-configuration/view 2023-10-31',
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });

      it('rejects requests to delete agent configuration', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /api/apm/settings/agent-configuration 2023-10-31',
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });

      // TODO: @Miriam - Its a PUT request, which means we must test it with all required params else it will throw 400. We need a 404 here
      xit('rejects requests to create/update agent configuration', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'PUT /api/apm/settings/agent-configuration 2023-10-31',
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });

      // TODO: @Miriam - Its a POST request, which means we must test it with all required params else it will throw 400. We need a 404 here
      xit('rejects requests to lookup single configuration', async () => {
        const { body, status } = await supertest
          .post('/api/apm/settings/agent-configuration/search 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(agentConfigurationResponse);
        expect(status).toBe(agentConfigurationResponse.statusCode);
      });
    });
    // it's returning 404 but we expect 501 Not implemented
    describe('source maps', () => {
      it('rejects requests to list source maps', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /api/apm/sourcemaps 2023-10-31',
          });
        } catch (err) {
          expect(err.res.status).toBe(sourceMapsResponse.statusCode);
          expect(err.res.body).toStrictEqual(sourceMapsResponse);
        }
      });

      xit('rejects requests to upload source maps', async () => {
        const { body, status } = await supertest
          .post('/api/apm/sourcemaps 2023-10-31')
          .set(svlCommonApi.getCommonRequestHeader())
          .send({ name: 'test', host_urls: ['https://localhost:8220'] });

        expect(body).toEqual(sourceMapsResponse);
        expect(status).toBe(sourceMapsResponse.statusCode);
      });

      xit('rejects requests to delete source map', async () => {
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
