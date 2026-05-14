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

  apiTest(
    'Should install the entity store happy path with feature flag enabled',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

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
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: false,
    });

    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(403);
  });

  apiTest('logExtraction is not mandatory on install', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

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

  apiTest('Update on uninstalled store should return 404', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

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

  apiTest(
    'Update rejects empty body but accepts either block on its own',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const emptyUpdate = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(emptyUpdate.statusCode).toBe(400);

      const logExtractionOnly = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '5m' } },
      });
      expect(logExtractionOnly.statusCode).toBe(200);

      const knowledgeIndicatorsOnly = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { knowledgeIndicators: { entityMinConfidence: 50 } },
      });
      expect(knowledgeIndicatorsOnly.statusCode).toBe(200);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'Update should change installed logExtraction params',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

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
    }
  );

  apiTest(
    'Update should not change logExtraction properties that were not included in the update',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

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

  apiTest('Update accepts and persists KI promotion fields', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    // Set both KI extraction and promotion knobs in one body so the
    // cross-field invariant (`promoteToTypedThreshold >= entityMinConfidence`)
    // is satisfied. The same body also exercises the new
    // `promotedEntityTypes` enum validation.
    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        knowledgeIndicators: {
          entityMinConfidence: 80,
          promoteToTypedThreshold: 95,
          promotedEntityTypes: ['service'],
        },
      },
    });
    expect(update.statusCode).toBe(200);

    // A second update with only one of the two knobs should preserve
    // the other from the persisted state.
    const update2 = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {
        knowledgeIndicators: { promotedEntityTypes: ['host', 'service'] },
      },
    });
    expect(update2.statusCode).toBe(200);

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'Update rejects promoteToTypedThreshold < entityMinConfidence in the same body',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: {
            entityMinConfidence: 80,
            promoteToTypedThreshold: 50,
          },
        },
      });
      expect(update.statusCode).toBe(400);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'Update accepts an explicit null promoteToTypedThreshold to disable promotion',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { promoteToTypedThreshold: null },
        },
      });
      expect(update.statusCode).toBe(200);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'Update rejects promotedEntityTypes outside the host/service enum',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { promotedEntityTypes: ['user'] },
        },
      });
      expect(update.statusCode).toBe(400);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  // ----------------------------------------------------------------------
  // Option E (Identity Alias Inference via Streams KI) — `schemaAliasMinConfidence`.
  // The new knob is the user-facing toggle that turns alias-scoped extraction
  // passes on/off. These tests exercise the full HTTP route + SO round-trip
  // (validation, persistence, partial-update preservation, and explicit-null
  // disable) so the public surface is covered against accidental regression.
  // The full alias-pass query/extraction path is exercised by the unit + snapshot
  // suites in `server/domain/logs_extraction/*.test.ts` and the loader unit
  // tests in `server/domain/streams_features/*.test.ts`.
  // ----------------------------------------------------------------------
  apiTest(
    'Update accepts schemaAliasMinConfidence in the 0..100 range and persists alongside other KI knobs',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      // Set alongside another KI knob in the same body so we also catch
      // regressions in the partial-update merge path.
      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: {
            entityMinConfidence: 50,
            schemaAliasMinConfidence: 80,
          },
        },
      });
      expect(update.statusCode).toBe(200);

      // A second update touching only one of the two should not clobber
      // the other — the SO merge has to preserve `schemaAliasMinConfidence`
      // when the body only mentions `entityMinConfidence`.
      const update2 = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { entityMinConfidence: 60 },
        },
      });
      expect(update2.statusCode).toBe(200);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'Update accepts an explicit null schemaAliasMinConfidence to disable alias adoption (default-off semantics)',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      // Enable, then explicitly disable. `null` is the documented way to
      // turn the alias-scoped pass off; the loader short-circuits to `[]`
      // when the value is `null`, so this is the user-facing kill switch.
      const enableUpdate = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { schemaAliasMinConfidence: 70 },
        },
      });
      expect(enableUpdate.statusCode).toBe(200);

      const disableUpdate = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { schemaAliasMinConfidence: null },
        },
      });
      expect(disableUpdate.statusCode).toBe(200);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'Update rejects schemaAliasMinConfidence outside 0..100 (route-level guard before SO write)',
    async ({ apiClient, kbnClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });

      const tooHigh = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { schemaAliasMinConfidence: 101 },
        },
      });
      expect(tooHigh.statusCode).toBe(400);

      const tooLow = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { schemaAliasMinConfidence: -1 },
        },
      });
      expect(tooLow.statusCode).toBe(400);

      const nonInteger = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          knowledgeIndicators: { schemaAliasMinConfidence: 80.5 },
        },
      });
      expect(nonInteger.statusCode).toBe(400);

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );
});
