/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOGlobalSettingsRoute, updateSLOGlobalSettingsRoute } from './global_settings';

const GET_ENDPOINT = 'GET /api/observability/slo_settings/global 2023-10-31';
const PUT_ENDPOINT = 'PUT /api/observability/slo_settings/global 2023-10-31';
const SLI_RETENTION_OVERRIDE = { enabled: true, periodDays: 200 };

describe('global SLO settings routes', () => {
  const createResources = () => {
    const globalSettingsRepository = { get: jest.fn().mockResolvedValue({}), save: jest.fn() };
    const resources = {
      request: {},
      logger: {},
      config: { sliRetention: SLI_RETENTION_OVERRIDE },
      plugins: {
        licensing: {
          start: jest.fn().mockResolvedValue({
            getLicense: jest.fn().mockResolvedValue({ hasAtLeast: () => true }),
          }),
        },
        security: {
          setup: { authz: { mode: { useRbacForRequest: () => false } } },
        },
      },
      getScopedClients: jest.fn().mockResolvedValue({ globalSettingsRepository }),
    };
    return { globalSettingsRepository, resources };
  };

  it('GET resolves the effective settings from the kibana.yml override', async () => {
    const { resources } = createResources();

    const response = await getSLOGlobalSettingsRoute[GET_ENDPOINT].handler(resources as never);

    expect(response).toEqual({
      sliRetention: expect.objectContaining({
        effective: { ...SLI_RETENTION_OVERRIDE, source: 'config' },
      }),
    });
  });

  it('PUT returns 400 without saving when the kibana.yml override is set', async () => {
    const { globalSettingsRepository, resources } = createResources();

    await expect(
      updateSLOGlobalSettingsRoute[PUT_ENDPOINT].handler({
        ...resources,
        params: { body: { sliRetention: { enabled: false, periodDays: 400 } } },
      } as never)
    ).rejects.toMatchObject({ output: { statusCode: 400 } });
    expect(globalSettingsRepository.save).not.toHaveBeenCalled();
  });
});
