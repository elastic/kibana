/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags, type ApiServicesFixture } from '@kbn/scout-oblt';
import { NIGHTSHIFT_ENABLED_FLAG } from '@kbn/nightshift-shared';
import {
  apiTest,
  getInvestigationQuotas,
  putInvestigationQuotas,
  NIGHTSHIFT_MANAGE_ENGINES_ROLE,
  NIGHTSHIFT_MANAGE_ROLE,
  NIGHTSHIFT_NO_ACCESS_ROLE,
  NIGHTSHIFT_READ_ROLE,
} from '../fixtures';

const setNightshiftEnabled = (apiServices: ApiServicesFixture, enabled: boolean | null) =>
  apiServices.core.settings({ 'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: enabled } });

// The limits are deployment-wide and the other specs in this suite start investigations, so this
// spec never turns enforcement on: it only ever leaves it off, and puts back what it found.
apiTest.describe(
  '/internal/nightshift/investigation_quotas',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let manageEnginesCookie: Record<string, string>;
    let original: {
      enabled: boolean;
      limits: {
        automatic_investigation: number | null;
        manual_investigation: number | null;
        total_investigation: number | null;
      };
    };

    apiTest.beforeAll(async ({ apiClient, apiServices, config, samlAuth }) => {
      // The API is gated on the nightshift.enabled flag, which can only be overridden where
      // coreApp.allowDynamicConfigOverrides is set (Scout's local configs), not on Cloud.
      apiTest.skip(
        config.isCloud === true,
        `Cannot override '${NIGHTSHIFT_ENABLED_FLAG}' on Cloud deployments`
      );
      if (config.isCloud) {
        return;
      }
      await setNightshiftEnabled(apiServices, true);
      const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGE_ENGINES_ROLE);
      const { body } = await getInvestigationQuotas(apiClient, cookieHeader);
      original = { enabled: body.enabled, limits: body.limits };
    });

    // A worker has a single custom role slot, so log in right before use.
    apiTest.beforeEach(async ({ samlAuth }) => {
      ({ cookieHeader: manageEnginesCookie } = await samlAuth.asInteractiveUser(
        NIGHTSHIFT_MANAGE_ENGINES_ROLE
      ));
    });

    apiTest.afterAll(async ({ apiClient, apiServices, config, samlAuth }) => {
      if (config.isCloud) {
        return;
      }
      try {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGE_ENGINES_ROLE);
        await putInvestigationQuotas(apiClient, cookieHeader, original);
      } finally {
        // The stateful Scout config starts the server with the flag on, so put it back on instead
        // of removing the override, which would leak into the next suite.
        await setNightshiftEnabled(apiServices, true);
      }
    });

    apiTest('returns the limits, today’s counts and the window', async ({ apiClient }) => {
      const response = await getInvestigationQuotas(apiClient, manageEnginesCookie);

      expect(response).toHaveStatusCode(200);
      expect(Object.keys(response.body.limits).sort()).toStrictEqual([
        'automatic_investigation',
        'manual_investigation',
        'total_investigation',
      ]);
      expect(Object.keys(response.body.counts).sort()).toStrictEqual([
        'automatic_investigation',
        'manual_investigation',
        'total_investigation',
      ]);
      expect(typeof response.body.enabled).toBe('boolean');
      expect(response.body.window.timezone).toBe('UTC');
      expect(response.body.canManage).toBe(true);
    });

    apiTest(
      'changes limits, removes one with null and keeps them while enforcement is off',
      async ({ apiClient }) => {
        const changed = await putInvestigationQuotas(apiClient, manageEnginesCookie, {
          enabled: false,
          limits: { manual_investigation: 7, automatic_investigation: null },
        });
        expect(changed).toHaveStatusCode(200);
        expect(changed.body.enabled).toBe(false);
        expect(changed.body.limits.manual_investigation).toBe(7);
        expect(changed.body.limits.automatic_investigation).toBeNull();

        const afterOtherChange = await putInvestigationQuotas(apiClient, manageEnginesCookie, {
          limits: { total_investigation: 9 },
        });
        expect(afterOtherChange).toHaveStatusCode(200);
        expect(afterOtherChange.body.limits).toStrictEqual({
          automatic_investigation: null,
          manual_investigation: 7,
          total_investigation: 9,
        });

        const read = await getInvestigationQuotas(apiClient, manageEnginesCookie);
        expect(read.body.limits).toStrictEqual(afterOtherChange.body.limits);
      }
    );

    apiTest('rejects invalid updates', async ({ apiClient }) => {
      for (const body of [
        { limits: { manual_investigation: 0 } },
        { limits: { manual_investigation: 10_001 } },
        { limits: { investigation: 3 } },
        { limits: {} },
        {},
      ]) {
        const response = await putInvestigationQuotas(apiClient, manageEnginesCookie, body);
        expect(response).toHaveStatusCode(400);
      }
    });

    apiTest(
      'lets read-only users see the limits but not change them',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: readCookie } = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ROLE);

        const read = await getInvestigationQuotas(apiClient, readCookie);
        expect(read).toHaveStatusCode(200);
        expect(read.body.canManage).toBe(false);

        const update = await putInvestigationQuotas(apiClient, readCookie, { enabled: false });
        expect(update).toHaveStatusCode(403);
      }
    );

    apiTest(
      'requires the configure privilege as well as manage to change the limits',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: manageCookie } = await samlAuth.asInteractiveUser(
          NIGHTSHIFT_MANAGE_ROLE
        );

        const update = await putInvestigationQuotas(apiClient, manageCookie, { enabled: false });

        expect(update).toHaveStatusCode(403);
      }
    );

    apiTest('rejects users without any Nightshift privilege', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_NO_ACCESS_ROLE);

      expect(await getInvestigationQuotas(apiClient, cookieHeader)).toHaveStatusCode(403);
      expect(
        await putInvestigationQuotas(apiClient, cookieHeader, { enabled: false })
      ).toHaveStatusCode(403);
    });

    apiTest('returns 404 while Nightshift is disabled', async ({ apiClient, apiServices }) => {
      await setNightshiftEnabled(apiServices, false);
      try {
        expect(await getInvestigationQuotas(apiClient, manageEnginesCookie)).toHaveStatusCode(404);
        expect(
          await putInvestigationQuotas(apiClient, manageEnginesCookie, { enabled: false })
        ).toHaveStatusCode(404);
      } finally {
        await setNightshiftEnabled(apiServices, true);
      }
    });
  }
);
