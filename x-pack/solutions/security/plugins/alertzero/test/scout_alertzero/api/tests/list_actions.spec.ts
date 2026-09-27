/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/api';
import type { ActionCatalogEntry } from '@kbn/alertzero-common';
import {
  apiTest,
  listActions,
  ACTION_IDS_BY_CATEGORY,
  ALL_ACTION_IDS,
  ALERTZERO_READ_ROLE,
  CATEGORIES_MAX_ITEMS,
  ISOLATE_HOST_ACTION_ID,
  NO_ALERTZERO_PRIVILEGE_ROLE,
} from '../fixtures';

const idsOf = (actions: ActionCatalogEntry[]): string[] =>
  actions.map((action) => action.workflowId);

apiTest.describe(
  'GET /internal/alertzero/actions — action catalog',
  // `xpack.alertzero.enabled` defaults to false and is turned on only by this
  // suite's local config set, so the cloud half of `stateful.classic` would call
  // an unregistered route and pass vacuously.
  { tag: ['@local-stateful-classic'] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(ALERTZERO_READ_ROLE));
    });

    apiTest(
      'returns the full installed action catalog when no categories param is sent',
      async ({ apiClient }) => {
        const response = await listActions(apiClient, cookieHeader);

        expect(response).toHaveStatusCode(200);
        const actions: ActionCatalogEntry[] = response.body.actions;
        expect(Array.isArray(actions)).toBe(true);
        expect(response.body.total).toBe(actions.length);

        // Every action workflow the plugin installs at start must be discoverable.
        // Asserted per-id (a superset check) so adding an action does not fail the
        // suite, while a *missing* one does.
        const installedIds = idsOf(actions);
        for (const expectedId of ALL_ACTION_IDS) {
          expect(installedIds).toContain(expectedId);
        }

        // Discovery is tag-driven, so only action workflows come back — never the
        // worker or rule workflows installed alongside them.
        for (const id of installedIds) {
          expect(id).toContain('-action-');
        }

        // The projected shape is the agent-facing contract, not just "an object".
        const isolateHost = actions.find((action) => action.workflowId === ISOLATE_HOST_ACTION_ID);
        expect(isolateHost).toBeDefined();
        expect(isolateHost!.name).toBe('Isolate host');
        expect(isolateHost!.category).toBe('respond');
        expect(isolateHost!.impact).toBe('high');
        expect(isolateHost!.approvalPolicy).toBe('always-gate');
        expect(typeof isolateHost!.description).toBe('string');
        expect(isolateHost!.description!.length).toBeGreaterThan(0);

        // Sorted by name so the agent sees a stable catalog order.
        const names = actions.map((action) => action.name);
        expect(names).toStrictEqual([...names].sort((a, b) => a.localeCompare(b)));
      }
    );

    apiTest(
      'filters to a single category and excludes every action outside it',
      async ({ apiClient }) => {
        const response = await listActions(apiClient, cookieHeader, { categories: ['respond'] });

        expect(response).toHaveStatusCode(200);
        const actions: ActionCatalogEntry[] = response.body.actions;
        const ids = idsOf(actions);

        expect(ids.sort()).toStrictEqual([...ACTION_IDS_BY_CATEGORY.respond].sort());
        expect(response.body.total).toBe(actions.length);
        for (const action of actions) {
          expect(action.category).toBe('respond');
        }
        // Exclusion is the half that catches a filter that silently no-ops.
        for (const excludedId of [
          ...ACTION_IDS_BY_CATEGORY.configure,
          ...ACTION_IDS_BY_CATEGORY.investigate,
        ]) {
          expect(ids).not.toContain(excludedId);
        }
      }
    );

    apiTest(
      'treats multiple categories as an OR-set across both repeated and comma-joined params',
      async ({ apiClient }) => {
        const expectedIds = [
          ...ACTION_IDS_BY_CATEGORY.respond,
          ...ACTION_IDS_BY_CATEGORY.investigate,
        ].sort();

        const repeated = await listActions(apiClient, cookieHeader, {
          categories: ['respond', 'investigate'],
        });
        expect(repeated).toHaveStatusCode(200);
        expect(idsOf(repeated.body.actions).sort()).toStrictEqual(expectedIds);
        for (const excludedId of ACTION_IDS_BY_CATEGORY.configure) {
          expect(idsOf(repeated.body.actions)).not.toContain(excludedId);
        }

        // The comma-joined form is a documented alias, so it must resolve to the
        // same set — not merely to a 200.
        const commaJoined = await listActions(apiClient, cookieHeader, {
          rawQuery: 'categories=respond,investigate',
        });
        expect(commaJoined).toHaveStatusCode(200);
        expect(idsOf(commaJoined.body.actions).sort()).toStrictEqual(expectedIds);
      }
    );

    apiTest(
      'returns an empty catalog with 200 for a category no installed action declares',
      async ({ apiClient }) => {
        const response = await listActions(apiClient, cookieHeader, {
          categories: ['no-such-category'],
        });

        // An unknown category is not an error: the vocabulary is solution-owned,
        // so it simply matches nothing.
        expect(response).toHaveStatusCode(200);
        expect(response.body.actions).toHaveLength(0);
        expect(response.body.total).toBe(0);
      }
    );

    apiTest(
      'ignores an empty categories param and returns the full catalog',
      async ({ apiClient }) => {
        const empty = await listActions(apiClient, cookieHeader, { rawQuery: 'categories=' });
        expect(empty).toHaveStatusCode(200);

        const unfiltered = await listActions(apiClient, cookieHeader);
        expect(unfiltered).toHaveStatusCode(200);

        // `categories=` must mean "no filter", not "filter on the empty string"
        // — the latter would return nothing.
        expect(idsOf(empty.body.actions).sort()).toStrictEqual(
          idsOf(unfiltered.body.actions).sort()
        );
        expect(empty.body.total).toBe(unfiltered.body.total);
        expect(empty.body.total).toBeGreaterThan(0);
      }
    );

    apiTest(
      `rejects more than ${CATEGORIES_MAX_ITEMS} categories with 400`,
      async ({ apiClient }) => {
        const tooMany = Array.from({ length: CATEGORIES_MAX_ITEMS + 1 }, (_, i) => `category-${i}`);
        const response = await listActions(apiClient, cookieHeader, { categories: tooMany });

        expect(response).toHaveStatusCode(400);
        expect(response.body.message).toContain(`at most ${CATEGORIES_MAX_ITEMS} values`);

        // The cap is exactly at the boundary: the largest accepted request still
        // succeeds, so the 400 above is the cap firing and not an unrelated error.
        const atCap = Array.from({ length: CATEGORIES_MAX_ITEMS }, (_, i) => `category-${i}`);
        const capped = await listActions(apiClient, cookieHeader, { categories: atCap });
        expect(capped).toHaveStatusCode(200);
      }
    );

    apiTest(
      'rejects an authenticated caller without the alertzero read privilege with 403',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader: unprivilegedCookieHeader } = await samlAuth.asInteractiveUser(
          NO_ALERTZERO_PRIVILEGE_ROLE
        );

        const response = await listActions(apiClient, unprivilegedCookieHeader);

        // 403, not 401: the caller is authenticated, just not entitled — which is
        // what proves `alertzero_read` is the authorization boundary.
        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest('rejects an unauthenticated request with 401', async ({ apiClient }) => {
      const response = await listActions(apiClient, {});

      expect(response).toHaveStatusCode(401);
    });
  }
);
