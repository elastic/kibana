/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2, type GetEntityMaintainersResponse } from '../../../../common';

apiTest.describe('Entity Store install / update API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };
  });

  apiTest.beforeEach(async ({ kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });
  });

  apiTest(
    'Should install the entity store happy path with feature flag enabled',
    async ({ apiClient }) => {
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(install.statusCode).toBe(201);

      const maintainersResponse = await apiClient.get(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET,
        {
          headers: internalHeaders,
          responseType: 'json',
        }
      );
      expect(maintainersResponse.statusCode).toBe(200);
      const { maintainers } = maintainersResponse.body as GetEntityMaintainersResponse;
      expect(maintainers.length).toBeGreaterThan(0);
      expect(maintainers.every((m) => m.taskStatus === 'started')).toBe(true);

      const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(uninstall.statusCode).toBe(200);
    }
  );

  apiTest('Should fail with feature flag disabled', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: false });

    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(403);
  });

  apiTest('logExtraction is not mandatory on install', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(201);

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'install with an explicit but empty logExtraction object still applies Service/Generic built-in cadence defaults',
    async ({ apiClient }) => {
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: {} },
      });
      expect(install.statusCode).toBe(201);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      const engines = (status.body as { engines: Array<{ type: string; frequency: string }> })
        .engines;
      // an empty {} must not be treated as if every field was explicitly supplied —
      // Service/Generic keep their own reduced-cadence defaults, not the global 1m
      expect(engines.find((e) => e.type === 'service')?.frequency).toBe('10m');
      expect(engines.find((e) => e.type === 'generic')?.frequency).toBe('30m');
      expect(engines.find((e) => e.type === 'host')?.frequency).toBe('1m');
      expect(engines.find((e) => e.type === 'user')?.frequency).toBe('1m');

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest('install rejects an invalid duration format for frequency', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { frequency: '10s' } },
    });
    expect(install.statusCode).toBe(400);
  });

  apiTest(
    'install rejects delay greater than or equal to lookbackPeriod',
    async ({ apiClient }) => {
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '3h', lookbackPeriod: '3h' } },
      });
      expect(install.statusCode).toBe(400);
    }
  );

  apiTest('install rejects an invalid index pattern', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { additionalIndexPatterns: ['has spaces'] } },
    });
    expect(install.statusCode).toBe(400);
  });

  apiTest('install rejects a numeric field below its minimum', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { maxLogsPerPage: 0 } },
    });
    expect(install.statusCode).toBe(400);
  });

  apiTest(
    'install preserves already-set custom config when a new type is added with an unrelated field',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entityTypes: ['host'],
          logExtraction: { maxLogsPerPage: 12345, maxTimeWindowSize: '22m' },
        },
      });

      // adding 'user' with only maxLogsPerWindow set must not reset host's earlier,
      // unrelated custom fields back to their defaults
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entityTypes: ['host', 'user'],
          logExtraction: { maxLogsPerWindow: 77777 },
        },
      });
      expect(install.statusCode).toBe(201);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      const engines = (
        status.body as {
          engines: Array<{
            type: string;
            maxLogsPerPage: number;
            maxTimeWindowSize: string;
            maxLogsPerWindow: number;
          }>;
        }
      ).engines;
      const host = engines.find((e) => e.type === 'host');
      const user = engines.find((e) => e.type === 'user');
      expect(host?.maxLogsPerPage).toBe(12345);
      expect(host?.maxTimeWindowSize).toBe('22m');
      // the new field applies store-wide, affecting both types
      expect(host?.maxLogsPerWindow).toBe(77777);
      expect(user?.maxLogsPerWindow).toBe(77777);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'install applies a value equal to a field default as a genuine explicit change, not a no-op',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entityTypes: ['host'],
          logExtraction: { maxLogsPerPage: 12345 },
        },
      });

      // adding a new type with maxLogsPerPage explicitly set back to its literal default (50000)
      // must apply that value for real, not be mistaken for "field not supplied"
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          entityTypes: ['host', 'user'],
          logExtraction: { maxLogsPerPage: 50000 },
        },
      });

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      const engines = (status.body as { engines: Array<{ type: string; maxLogsPerPage: number }> })
        .engines;
      expect(engines.find((e) => e.type === 'host')?.maxLogsPerPage).toBe(50000);
      expect(engines.find((e) => e.type === 'user')?.maxLogsPerPage).toBe(50000);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'install with every logExtraction field explicitly set applies a full replace matching the request',
    async ({ apiClient }) => {
      const fullConfig = {
        fieldHistoryLength: 30,
        additionalIndexPatterns: ['logs-custom-*'],
        excludedIndexPatterns: ['logs-exclude-*'],
        lookbackPeriod: '6h',
        frequency: '2m',
        delay: '2m',
        docsLimit: 500,
        maxLogsPerPage: 1000,
        maxTimeWindowSize: '10m',
        maxLogsPerWindow: 2000,
        maxLogsPerWindowCapBehavior: 'defer',
      };
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: fullConfig },
      });
      expect(install.statusCode).toBe(201);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      const engines = (status.body as { engines: Array<{ type: string } & typeof fullConfig> })
        .engines;
      // fully explicit cadence fields are a request for the whole store: they win over
      // Service/Generic's built-in defaults too, so every type matches exactly
      for (const engine of engines) {
        expect(engine.frequency).toBe(fullConfig.frequency);
        expect(engine.delay).toBe(fullConfig.delay);
        expect(engine.lookbackPeriod).toBe(fullConfig.lookbackPeriod);
        expect(engine.fieldHistoryLength).toBe(fullConfig.fieldHistoryLength);
        expect(engine.maxLogsPerPage).toBe(fullConfig.maxLogsPerPage);
        expect(engine.maxTimeWindowSize).toBe(fullConfig.maxTimeWindowSize);
        expect(engine.maxLogsPerWindow).toBe(fullConfig.maxLogsPerWindow);
        expect(engine.maxLogsPerWindowCapBehavior).toBe(fullConfig.maxLogsPerWindowCapBehavior);
      }

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest('Update on uninstalled store should return 404', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { frequency: '1m' } },
    });
    expect(update.statusCode).toBe(404);
  });

  apiTest('logExtraction is mandatory on update', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(update.statusCode).toBe(400);

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest('Update should change installed logExtraction params', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { delay: '2m' } },
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { delay: '5m' } },
    });
    expect(update.statusCode).toBe(200);

    const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(status.statusCode).toBe(200);
    const engines = (status.body as { engines: Array<{ delay: string }> }).engines;
    expect(engines.length).toBeGreaterThan(0);
    expect(engines[0].delay).toBe('5m');

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'Update with an explicit frequency resets per-type cadence overrides for every type',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '5m' } },
      });
      expect(update.statusCode).toBe(200);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      const engines = (status.body as { engines: Array<{ type: string; frequency: string }> })
        .engines;
      // Service/Generic's built-in cadence defaults (10m/30m) are cleared; every type now
      // follows the explicitly requested global frequency uniformly.
      for (const engine of engines) {
        expect(engine.frequency).toBe('5m');
      }

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest('install rejects unknown body keys', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(install.statusCode).toBe(400);
  });

  apiTest('update rejects unknown body keys', async ({ apiClient }) => {
    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(update.statusCode).toBe(400);
  });

  apiTest('uninstall rejects unknown body keys', async ({ apiClient }) => {
    const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(uninstall.statusCode).toBe(400);
  });

  apiTest(
    'Update should not change logExtraction properties that were not included in the update',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '2m', frequency: '1m' } },
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '5m' } },
      });
      expect(update.statusCode).toBe(200);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(status.statusCode).toBe(200);
      const engines = (status.body as { engines: Array<{ delay: string; frequency: string }> })
        .engines;
      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].delay).toBe('5m');
      expect(engines[0].frequency).toBe('1m');

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );
});
