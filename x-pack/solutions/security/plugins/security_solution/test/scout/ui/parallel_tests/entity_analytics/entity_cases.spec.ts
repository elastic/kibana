/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity attachment cases E2E tests.
 *
 * PREREQUISITE — server must be started with the experimental feature flag enabled:
 *
 *   node scripts/kibana --dev \
 *     --xpack.securitySolution.enableExperimental='["entityAttachmentsEnabled"]'
 *
 * The entity store must also be running so that entities have a canonical `entity.id`
 * (entityStoreId). Without it the "Add to new/existing case" actions are hidden even
 * when the flag is on. Start the entity store via the Entity Analytics management page
 * or via:
 *
 *   curl -X POST 'http://localhost:5601/api/entity_store/enable' \
 *     -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{}'
 *
 * These tests are skipped until the feature graduates from experimental status.
 * To run them locally: remove the `.skip` from `spaceTest.describe.skip` below,
 * start the server with the flag above, and run:
 *
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/ui/parallel_tests/entity_analytics/entity_cases.spec.ts
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { CUSTOM_QUERY_RULE } from '@kbn/scout-security/src/playwright/constants/detection_rules';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

// ── Selectors ────────────────────────────────────────────────────────────────

// Flyout footer / Take Action popover
const TAKE_ACTION_BUTTON = 'take-action-button';
const ADD_TO_NEW_CASE_ITEM = 'eaCasesAddToNewCase';
const ADD_TO_EXISTING_CASE_ITEM = 'eaCasesAddToExistingCase';

// Cases UI
const CASE_VIEW_ENTITIES_TAB = 'case-view-tab-title-entities';
const ENTITY_TAB_TABLE = 'eaCasesEntityTabTable';
const ENTITY_TAB_EMPTY = 'eaCasesEntityTabEmpty';

// Cases new-case flyout (from the Cases plugin UI)
const CREATE_CASE_SUBMIT_BUTTON = 'create-case-submit';
const CREATE_CASE_NAME_INPUT = 'input[data-test-subj="input"][aria-label*="Case name"]';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CASES_API = '/api/cases';

async function deleteAllCasesInSpace(
  kbnClient: import('@kbn/scout').KbnClient,
  spaceId: string
): Promise<void> {
  const response = await kbnClient.request<{ cases: Array<{ id: string }> }>({
    method: 'GET',
    path: `/s/${spaceId}${CASES_API}?perPage=100`,
  });
  const ids = (response.data?.cases ?? []).map((c) => c.id);
  if (ids.length > 0) {
    await kbnClient.request({
      method: 'DELETE',
      path: `/s/${spaceId}${CASES_API}`,
      body: { ids },
      headers: { 'kbn-xsrf': 'scout' },
    });
  }
}

async function createCaseWithEntityAttachment(
  kbnClient: import('@kbn/scout').KbnClient,
  spaceId: string,
  {
    caseName,
    entityStoreId,
    entityName,
    entityType,
  }: { caseName: string; entityStoreId: string; entityName: string; entityType: 'host' | 'user' }
): Promise<string> {
  const caseResp = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/s/${spaceId}${CASES_API}`,
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      title: caseName,
      description: 'Created by Scout entity attachment test',
      tags: ['scout'],
      connector: { id: 'none', name: 'none', type: '.none', fields: null },
      settings: { syncAlerts: false },
      owner: 'securitySolution',
    },
  });
  const caseId = caseResp.data.id;

  await kbnClient.request({
    method: 'POST',
    path: `/s/${spaceId}${CASES_API}/${caseId}/comments`,
    headers: { 'kbn-xsrf': 'scout' },
    body: {
      type: SECURITY_ENTITY_ATTACHMENT_TYPE,
      attachmentId: entityStoreId,
      metadata: { entityName, entityType },
      owner: 'securitySolution',
    },
  });

  return caseId;
}

// ── Test suite ────────────────────────────────────────────────────────────────

const ALERT_RULE: typeof CUSTOM_QUERY_RULE = {
  ...CUSTOM_QUERY_RULE,
  name: 'Entity Cases E2E Rule',
  query: 'host.name:* or user.name:*',
  rule_id: 'entity-cases-e2e-rule',
};

/*
 * Remove `.skip` and ensure the server is started with `entityAttachmentsEnabled`
 * before running these tests (see file-level JSDoc above).
 */
spaceTest.describe.skip(
  'Entity attachment cases – flyout add-to-case actions and Entities tab',
  { tag: [...tags.stateful.classic] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace, kbnClient }) => {
      await deleteAllCasesInSpace(kbnClient, scoutSpace.id);
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();

      await apiServices.detectionRule.createCustomQueryRule({
        ...ALERT_RULE,
        name: `${ALERT_RULE.name}_${scoutSpace.id}`,
      });

      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace, kbnClient }) => {
      await deleteAllCasesInSpace(kbnClient, scoutSpace.id);
      await apiServices.detectionRule.deleteAll();
      await apiServices.detectionAlerts.deleteAll();
    });

    // ── Take Action menu ──────────────────────────────────────────────────────

    spaceTest(
      'shows Add to new case and Add to existing case in the host flyout Take Action menu',
      async ({ page, scoutSpace }) => {
        await page.gotoApp('security', {
          path: `/s/${scoutSpace.id}/app/security/alerts`,
        });

        // Wait for an alert row and open the host entity flyout via its link.
        const hostLink = page.testSubj.locator('host-details-button').first();
        await hostLink.waitFor();
        await hostLink.click();

        // The host right panel footer renders the Take Action popover.
        const takeActionButton = page.testSubj.locator(TAKE_ACTION_BUTTON);
        await takeActionButton.waitFor();
        await takeActionButton.click();

        await expect(page.testSubj.locator(ADD_TO_NEW_CASE_ITEM)).toBeVisible();
        await expect(page.testSubj.locator(ADD_TO_EXISTING_CASE_ITEM)).toBeVisible();
      }
    );

    spaceTest(
      'shows Add to new case and Add to existing case in the user flyout Take Action menu',
      async ({ page, scoutSpace }) => {
        await page.gotoApp('security', {
          path: `/s/${scoutSpace.id}/app/security/alerts`,
        });

        const userLink = page.testSubj.locator('users-link').first();
        await userLink.waitFor();
        await userLink.click();

        const takeActionButton = page.testSubj.locator(TAKE_ACTION_BUTTON);
        await takeActionButton.waitFor();
        await takeActionButton.click();

        await expect(page.testSubj.locator(ADD_TO_NEW_CASE_ITEM)).toBeVisible();
        await expect(page.testSubj.locator(ADD_TO_EXISTING_CASE_ITEM)).toBeVisible();
      }
    );

    // ── Add to new case flow ──────────────────────────────────────────────────

    spaceTest(
      'adds a host entity to a new case and the Entities tab shows the attached entity',
      async ({ page, scoutSpace }) => {
        const caseName = `Scout entity case – host – ${scoutSpace.id}`;

        await page.gotoApp('security', {
          path: `/s/${scoutSpace.id}/app/security/alerts`,
        });

        await spaceTest.step('open host flyout and click Add to new case', async () => {
          const hostLink = page.testSubj.locator('host-details-button').first();
          await hostLink.waitFor();
          await hostLink.click();

          const takeActionButton = page.testSubj.locator(TAKE_ACTION_BUTTON);
          await takeActionButton.waitFor();
          await takeActionButton.click();

          await page.testSubj.locator(ADD_TO_NEW_CASE_ITEM).click();
        });

        await spaceTest.step('create the case via the Cases flyout', async () => {
          // The cases plugin renders a flyout with a name field.
          const nameField = page.locator(CREATE_CASE_NAME_INPUT);
          await nameField.waitFor();
          await nameField.fill(caseName);

          await page.testSubj.locator(CREATE_CASE_SUBMIT_BUTTON).click();
        });

        await spaceTest.step('navigate to the new case and check the Entities tab', async () => {
          // A toast with a link to the case is shown; click it.
          const caseToastLink = page.locator('[data-test-subj*="toastLink"]');
          await caseToastLink.first().click();

          // The Entities tab should be visible for cases that have entity attachments.
          await expect(page.testSubj.locator(CASE_VIEW_ENTITIES_TAB)).toBeVisible({
            timeout: 15000,
          });
          await page.testSubj.locator(CASE_VIEW_ENTITIES_TAB).click();

          await expect(page.testSubj.locator(ENTITY_TAB_TABLE)).toBeVisible({ timeout: 15000 });
        });
      }
    );

    // ── Entities tab – pre-seeded via API ─────────────────────────────────────

    spaceTest(
      'Entities tab renders the entity table when attachments were added via API',
      async ({ page, scoutSpace, kbnClient }) => {
        const caseId = await createCaseWithEntityAttachment(kbnClient, scoutSpace.id, {
          caseName: `Scout entity case – API – ${scoutSpace.id}`,
          entityStoreId: 'test-entity-store-id',
          entityName: 'scout-host',
          entityType: 'host',
        });

        await page.gotoApp('security', {
          path: `/s/${scoutSpace.id}/app/security/cases/${caseId}`,
        });

        await expect(page.testSubj.locator(CASE_VIEW_ENTITIES_TAB)).toBeVisible({
          timeout: 15000,
        });
        await page.testSubj.locator(CASE_VIEW_ENTITIES_TAB).click();

        await expect(page.testSubj.locator(ENTITY_TAB_TABLE)).toBeVisible({ timeout: 15000 });
      }
    );

    spaceTest(
      'Entities tab renders the empty state when a case has no entity attachments',
      async ({ page, scoutSpace, kbnClient }) => {
        // Create a plain case with no entity attachments.
        const caseResp = await kbnClient.request<{ id: string }>({
          method: 'POST',
          path: `/s/${scoutSpace.id}${CASES_API}`,
          headers: { 'kbn-xsrf': 'scout' },
          body: {
            title: `Scout entity case – empty – ${scoutSpace.id}`,
            description: 'No entity attachments',
            tags: [],
            connector: { id: 'none', name: 'none', type: '.none', fields: null },
            settings: { syncAlerts: false },
            owner: 'securitySolution',
          },
        });

        await page.gotoApp('security', {
          path: `/s/${scoutSpace.id}/app/security/cases/${caseResp.data.id}`,
        });

        await expect(page.testSubj.locator(CASE_VIEW_ENTITIES_TAB)).toBeVisible({
          timeout: 15000,
        });
        await page.testSubj.locator(CASE_VIEW_ENTITIES_TAB).click();

        await expect(page.testSubj.locator(ENTITY_TAB_EMPTY)).toBeVisible({ timeout: 15000 });
        await expect(page.testSubj.locator(ENTITY_TAB_TABLE)).not.toBeVisible();
      }
    );
  }
);
