/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/api';
import { tags, type ApiClientFixture, type KibanaRole } from '@kbn/scout-oblt';
import { NIGHTSHIFT_ENABLED_FLAG, NIGHTSHIFT_FEATURE_ID } from '@kbn/nightshift-shared';
import type { InvestigatorServiceAccountStatus } from '../../../../common';
import { apiTest, COMMON_HEADERS, NIGHTSHIFT_READ_ROLE, uniqueId } from '../fixtures';

const ROLE: KibanaRole = {
  elasticsearch: { cluster: ['manage_security'], indices: [] },
  kibana: [
    {
      base: [],
      feature: {
        [NIGHTSHIFT_FEATURE_ID]: ['all'],
        agentBuilder: ['all'],
        workflowsManagement: ['all'],
        actions: ['read'],
      },
      spaces: ['*'],
    },
  ],
};
const PATH = 'internal/nightshift/automations';
interface Automation {
  id: string;
  workflowId: string;
  isEnabled: boolean;
}
const createRequest =
  (apiClient: ApiClientFixture, cookies: () => Record<string, string>) =>
  (method: 'get' | 'post' | 'put' | 'delete', path: string, body?: object, auth = cookies()) =>
    apiClient[method](path, {
      headers: {
        ...COMMON_HEADERS,
        ...auth,
        ...(path.startsWith('api/workflows') ? { 'elastic-api-version': '2023-10-31' } : {}),
      },
      responseType: 'json',
      ...(body ? { body } : {}),
    });

apiTest.describe(
  'Automation backing workflow repair',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let cookieHeader: Record<string, string>;
    let automation: Automation | undefined;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: true },
      });
      ({ cookieHeader } = await samlAuth.asInteractiveUser(ROLE));
    });

    apiTest.afterAll(async ({ apiClient, apiServices, samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(ROLE));
      if (automation)
        expect(
          await createRequest(apiClient, () => cookieHeader)('delete', `${PATH}/${automation.id}`)
        ).toHaveStatusCode(200);
      await apiServices.core.settings({
        'feature_flags.overrides': { [NIGHTSHIFT_ENABLED_FLAG]: null },
      });
    });

    apiTest(
      'recreates a deleted workflow paused, then allows enabling and editing',
      async ({ apiClient, samlAuth }) => {
        const request = createRequest(apiClient, () => cookieHeader);
        const setup = await request('get', 'internal/nightshift/investigations/service_account');
        expect(setup).toHaveStatusCode(200);
        const runAs = (setup.body as InvestigatorServiceAccountStatus).serviceAccounts.find(
          (account) => account.kind === 'automations'
        )?.id;
        if (!runAs) throw new Error('Automations service account is not configured');
        // Keep the schedule outside the test window; this journey never starts an investigation.
        const later = new Date(Date.now() + 12 * 60 * 60 * 1000);
        const created = await request('post', PATH, {
          name: uniqueId('scout-repair'),
          isEnabled: true,
          trigger: {
            rows: [
              {
                kind: 'schedule',
                schedulePreset: 'daily',
                time: later.toISOString().slice(11, 16),
                timezone: 'UTC',
              },
            ],
          },
          execution: { promptTemplate: 'Review health.' },
          completions: [],
          runtime: { dailyDispatchLimit: 3 },
        });
        expect(created).toHaveStatusCode(200);
        automation = created.body as Automation;
        const { id, workflowId: oldId } = automation;
        expect(await request('delete', 'api/workflows', { ids: [oldId] })).toHaveStatusCode(200);
        const missing = await request('get', `${PATH}/${id}`);
        expect(missing).toHaveStatusCode(200);
        expect(missing.body).toMatchObject({ isWorkflowMissing: true, isEnabled: true });
        const reader = await samlAuth.asInteractiveUser(NIGHTSHIFT_READ_ROLE);
        const read = await request('get', `${PATH}/${id}`, undefined, reader.cookieHeader);
        expect(read).toHaveStatusCode(200);
        expect(read.body).toMatchObject({ isWorkflowMissing: true });
        expect(
          await request('post', `${PATH}/${id}/repair`, undefined, reader.cookieHeader)
        ).toHaveStatusCode(403);
        ({ cookieHeader } = await samlAuth.asInteractiveUser(ROLE));
        const repaired = await request('post', `${PATH}/${id}/repair`);
        expect(repaired).toHaveStatusCode(200);
        automation = repaired.body as Automation;
        expect(automation).toMatchObject({ id, isEnabled: false });
        expect(automation.workflowId).not.toBe(oldId);
        const workflow = await request('get', `api/workflows/workflow/${automation.workflowId}`);
        expect(workflow).toHaveStatusCode(200);
        expect(workflow.body).toMatchObject({
          enabled: false,
          definition: { settings: { run_as: runAs } },
        });
        const current = await request('get', `${PATH}/${id}`);
        expect(current).toHaveStatusCode(200);
        expect(current.body).toMatchObject({ isWorkflowMissing: false });
        const repeated = await request('post', `${PATH}/${id}/repair`);
        expect(repeated).toHaveStatusCode(200);
        expect(repeated.body).toMatchObject({
          workflowId: automation.workflowId,
          isEnabled: false,
        });
        const updated = await request('put', `${PATH}/${id}`, {
          name: 'Repaired health check',
          isEnabled: true,
        });
        expect(updated).toHaveStatusCode(200);
        expect(updated.body).toMatchObject({
          name: 'Repaired health check',
          isEnabled: true,
          workflowId: automation.workflowId,
        });
        const enabled = await request('get', `api/workflows/workflow/${automation.workflowId}`);
        expect(enabled).toHaveStatusCode(200);
        expect(enabled.body).toMatchObject({ enabled: true });
      }
    );
  }
);
