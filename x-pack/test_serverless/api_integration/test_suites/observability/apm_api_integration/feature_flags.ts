/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { APMFtrContextProvider } from './common/services';
import { ApmApiClient } from './common/apm_api_supertest';

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

const SAMPLE_SOURCEMAP = {
  version: 3,
  file: 'out.js',
  sourceRoot: '',
  sources: ['foo.js', 'bar.js'],
  sourcesContent: ['', null],
  names: ['src', 'maps', 'are', 'fun'],
  mappings: 'A,AAAB;;ABCDE;',
};

async function uploadSourcemap(
  apmApiClient: ApmApiClient,
  roleAuthc: RoleCredentials,
  internalReqHeader: InternalRequestHeader
) {
  const response = await apmApiClient.slsUser({
    endpoint: 'POST /api/apm/sourcemaps 2023-10-31',
    type: 'form-data',
    params: {
      body: {
        service_name: 'uploading-test',
        service_version: '1.0.0',
        bundle_filepath: 'bar',
        sourcemap: JSON.stringify(SAMPLE_SOURCEMAP),
      },
    },
    roleAuthc,
    internalReqHeader,
  });
  return response.body;
}

export default function ({ getService }: APMFtrContextProvider) {
  const apmApiClient = getService('apmApiClient');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');

  describe('apm feature flags', () => {
    let roleAuthc: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;

    before(async () => {
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('fleet migrations', () => {
      it('rejects requests to save apm server schema', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'POST /api/apm/fleet/apm_server_schema 2023-10-31',
            params: {
              body: {
                schema: {
                  tail_sampling_enabled: true,
                },
              },
            },
            roleAuthc,
            internalReqHeader,
          });
        } catch (err) {
          expect(err.res.status).toBe(fleetMigrationResponse.statusCode);
          expect(err.res.body).toStrictEqual(fleetMigrationResponse);
        }
      });

      it('rejects requests to get unsupported apm server schema', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /internal/apm/fleet/apm_server_schema/unsupported',
            roleAuthc,
            internalReqHeader,
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
            roleAuthc,
            internalReqHeader,
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
            roleAuthc,
            internalReqHeader,
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
            roleAuthc,
            internalReqHeader,
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });

      it('rejects requests to delete agent configuration', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'DELETE /api/apm/settings/agent-configuration 2023-10-31',
            params: {
              body: {
                service: {},
              },
            },
            roleAuthc,
            internalReqHeader,
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });

      it('rejects requests to create/update agent configuration', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'PUT /api/apm/settings/agent-configuration 2023-10-31',
            params: {
              body: {
                service: {},
                settings: { transaction_sample_rate: '0.55' },
              },
            },
            roleAuthc,
            internalReqHeader,
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });

      it('rejects requests to lookup single configuration', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'POST /api/apm/settings/agent-configuration/search 2023-10-31',
            params: {
              body: {
                service: { name: 'myservice', environment: 'development' },
                etag: '7312bdcc34999629a3d39df24ed9b2a7553c0c39',
              },
            },
            roleAuthc,
            internalReqHeader,
          });
        } catch (err) {
          expect(err.res.status).toBe(agentConfigurationResponse.statusCode);
          expect(err.res.body).toStrictEqual(agentConfigurationResponse);
        }
      });
    });

    describe('source maps', () => {
      it('rejects requests to list source maps', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'GET /api/apm/sourcemaps 2023-10-31',
            roleAuthc,
            internalReqHeader,
          });
        } catch (err) {
          expect(err.res.status).toBe(sourceMapsResponse.statusCode);
          expect(err.res.body).toStrictEqual(sourceMapsResponse);
        }
      });

      it('rejects requests to upload source maps', async () => {
        try {
          await uploadSourcemap(apmApiClient, roleAuthc, internalReqHeader);
        } catch (err) {
          expect(err.res.status).toBe(sourceMapsResponse.statusCode);
          expect(err.res.body).toStrictEqual(sourceMapsResponse);
        }
      });

      it('rejects requests to delete source map', async () => {
        try {
          await apmApiClient.slsUser({
            endpoint: 'DELETE /api/apm/sourcemaps/{id} 2023-10-31',
            params: { path: { id: 'foo' } },
            roleAuthc,
            internalReqHeader,
          });
        } catch (err) {
          expect(err.res.status).toBe(sourceMapsResponse.statusCode);
          expect(err.res.body).toStrictEqual(sourceMapsResponse);
        }
      });
    });
  });
}
