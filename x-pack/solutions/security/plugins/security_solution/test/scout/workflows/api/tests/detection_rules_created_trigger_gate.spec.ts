/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { apiTest, tags, testData, createWorkflow, deleteWorkflow } from '../fixtures';

const DETECTION_ENGINE_RULES_URL = '/api/detection_engine/rules';
const DETECTION_ENGINE_BULK_ACTION_URL = '/api/detection_engine/rules/_bulk_action';
const SETUP_TIMEOUT_MS = 60_000;
// A run starts within a few seconds of the event (see the positive test next door), so this is
// ample for an event that was emitted to have started one.
const NO_RUN_WAIT_MS = 10_000;

const triggerWorkflowYaml = `
name: security.detectionRulesCreated gate test
enabled: true
triggers:
  - type: security.detectionRulesCreated
steps:
  - name: record_event
    type: data.set
    with:
      ids: "\${{ event.ids }}"
`;

// The trigger is only emitted while AlertZero is enabled, and this server config does not enable
// it, which is what every deployment without AlertZero looks like. Creating rules must then start
// nothing. The positive counterpart, with AlertZero on and the same workflow, is
// `scout_alertzero_rules_created`.
apiTest.describe(
  'security.detectionRulesCreated trigger without AlertZero',
  { tag: [...tags.stateful.classic] },
  () => {
    let editorHeaders: Record<string, string>;
    let workflowId: string;
    const createdRuleIds: string[] = [];

    apiTest.beforeAll(async ({ samlAuth, apiClient }) => {
      apiTest.setTimeout(SETUP_TIMEOUT_MS);

      const editorCredentials = await samlAuth.asInteractiveUser('editor');
      editorHeaders = { ...editorCredentials.cookieHeader, ...testData.COMMON_HEADERS };
      workflowId = await createWorkflow(apiClient, editorHeaders, triggerWorkflowYaml);
    });

    apiTest.afterAll(async ({ apiClient }) => {
      await deleteWorkflow(apiClient, editorHeaders, workflowId);

      if (createdRuleIds.length > 0) {
        const response = await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
          headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
          responseType: 'json',
          body: { action: 'delete', ids: createdRuleIds },
        });
        // A partial failure answers 500, so a rule left behind fails the suite instead of leaking.
        expect(response).toHaveStatusCode(200);
      }
    });

    apiTest(
      'does not start a subscribed workflow for a created or a duplicated rule',
      async ({ apiClient }) => {
        const created = await apiClient.post(DETECTION_ENGINE_RULES_URL, {
          headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
          responseType: 'json',
          body: {
            type: 'query',
            name: `Scout rules created gate ${Date.now()}`,
            description: 'Created by a Scout API test',
            query: '*:*',
            language: 'kuery',
            severity: 'low',
            risk_score: 21,
            enabled: false,
          },
        });
        expect(created).toHaveStatusCode(200);
        const { id } = created.body as { id: string };
        createdRuleIds.push(id);

        // Duplicating goes through its own route, which has its own emit.
        const duplicated = await apiClient.post(DETECTION_ENGINE_BULK_ACTION_URL, {
          headers: { ...editorHeaders, ...PUBLIC_API_HEADERS },
          responseType: 'json',
          body: {
            action: 'duplicate',
            ids: [id],
            duplicate: { include_exceptions: false, include_expired_exceptions: false },
          },
        });
        expect(duplicated).toHaveStatusCode(200);
        const [{ id: duplicateId }] = (
          duplicated.body as { attributes: { results: { created: Array<{ id: string }> } } }
        ).attributes.results.created;
        createdRuleIds.push(duplicateId);

        // Absence cannot be waited for, so give an emitted event time to have started a run.
        await new Promise((resolve) => setTimeout(resolve, NO_RUN_WAIT_MS));

        const executions = await apiClient.get(`/api/workflows/workflow/${workflowId}/executions`, {
          headers: editorHeaders,
          responseType: 'json',
        });
        expect(executions).toHaveStatusCode(200);
        expect((executions.body as { results: unknown[] }).results).toHaveLength(0);
      }
    );
  }
);
