/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags } from '@kbn/scout-oblt';
import type { ApiClientFixture, ScoutTestConfig } from '@kbn/scout-oblt';
import type { InvestigatorServiceAccountStatus } from '../../../../common';
import {
  apiTest,
  COMMON_HEADERS,
  getNightshiftServiceAccountStatus,
  INVESTIGATIONS_WRITE_ROLE,
  NIGHTSHIFT_MANAGE_ROLE,
  NIGHTSHIFT_NO_ACCESS_ROLE,
  SERVICE_ACCOUNT_PATH,
  uniqueId,
} from '../fixtures';

// Spelled out rather than imported: `@kbn/workflows/managed` pulls in the workflow YAML files,
// which Playwright's loader cannot read. Keep in sync with
// `getNightshiftBoundInvestigationWorkflowId`, whose rename this assertion then catches.
const DEFAULT_SPACE_ENTRY_POINT = 'system-nightshift-investigation-bound-default';
const START_PATH = 'internal/nightshift/investigations';

/** Serverless holds the predefined, `_`-prefixed roles; stateful creates them under their name. */
const rolePrefixOf = (config: ScoutTestConfig): string => (config.serverless ? '_' : '');

const readStatus = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>
): Promise<InvestigatorServiceAccountStatus> =>
  getNightshiftServiceAccountStatus(apiClient, cookieHeader);

/**
 * The suite's global setup sets the default space up as the deployment's admin. These tests read
 * that setup back, and check what a caller without `manage_security` may do with it.
 */
apiTest.describe(
  'Nightshift service account setup',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let adminCookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader: adminCookieHeader } = await samlAuth.asInteractiveUser('admin'));
    });

    apiTest(
      'runs investigations in this space as the Nightshift agent account',
      async ({ apiClient }) => {
        const status = await readStatus(apiClient, adminCookieHeader);

        expect(status.serviceAccountsEnabled).toBe(true);
        expect(status.installed).toBe(true);
        expect(status.enabled).toBe(true);
        expect(status.bound).toBe(true);
        expect(Boolean(status.serviceAccountId)).toBe(true);
        expect(status.workflowId).toBe(DEFAULT_SPACE_ENTRY_POINT);
      }
    );

    apiTest('binds every workflow of the space to that one account', async ({ apiClient }) => {
      const { serviceAccountId, boundWorkflows } = await readStatus(apiClient, adminCookieHeader);

      expect(boundWorkflows.length).toBeGreaterThan(0);
      expect(
        boundWorkflows.map(({ workflowId, installed, runAs, bound }) => ({
          workflowId,
          installed,
          runAs,
          bound,
        }))
      ).toStrictEqual(
        boundWorkflows.map(({ workflowId }) => ({
          workflowId,
          installed: true,
          runAs: serviceAccountId,
          bound: true,
        }))
      );
    });

    apiTest(
      'names both accounts with the roles of this deployment',
      async ({ apiClient, config }) => {
        const { serviceAccounts } = await readStatus(apiClient, adminCookieHeader);
        const rolePrefix = rolePrefixOf(config);

        expect(serviceAccounts.map(({ kind, name, role }) => ({ kind, name, role }))).toStrictEqual(
          [
            { kind: 'agent', name: 'nightshift_agent', role: `${rolePrefix}nightshift_agent` },
            {
              kind: 'automations',
              name: 'nightshift_automations',
              role: `${rolePrefix}nightshift_automations`,
            },
          ]
        );
        // Only the service accounts backend assigns the ids, so setup found or created the accounts.
        expect(serviceAccounts.every(({ id }) => Boolean(id))).toBe(true);
      }
    );

    apiTest(
      'refuses to set a space up for a caller without manage_security',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        const { serviceAccounts } = await readStatus(apiClient, adminCookieHeader);
        const serviceAccountIds = Object.fromEntries(
          serviceAccounts.map(({ kind, id }) => [kind, id])
        );

        const response = await apiClient.post(`${SERVICE_ACCOUNT_PATH}/_enable`, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          body: { serviceAccountIds },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'tells a Nightshift manager without manage_security that the space is set up but not theirs to change',
      async ({ apiClient, samlAuth }) => {
        // Nightshift `all` alone, without Agent Builder: the automations page gates on this status.
        const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_MANAGE_ROLE);

        const status = await readStatus(apiClient, cookieHeader);

        expect(status.bound).toBe(true);
        expect(status.canModifyBoundWorkflows).toBe(false);
      }
    );

    apiTest(
      'does not show the setup to a user without Nightshift access',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(NIGHTSHIFT_NO_ACCESS_ROLE);

        const response = await apiClient.get(SERVICE_ACCOUNT_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(403);
      }
    );

    apiTest(
      'refuses investigations in a space that was never set up',
      async ({ apiClient, samlAuth, kbnClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(INVESTIGATIONS_WRITE_ROLE);
        // A space of its own, so the default space the other specs investigate in stays set up.
        const spaceId = uniqueId('nightshift-unset');
        await kbnClient.spaces.create({ id: spaceId, name: spaceId });

        try {
          const response = await apiClient.post(`s/${spaceId}/${START_PATH}`, {
            headers: { ...COMMON_HEADERS, ...cookieHeader },
            body: {
              subject: { type: 'manual', id: uniqueId('setup-manual') },
              message: 'Investigate in a space without the Nightshift service account',
            },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(503);
        } finally {
          await kbnClient.spaces.delete(spaceId);
        }
      }
    );
  }
);
