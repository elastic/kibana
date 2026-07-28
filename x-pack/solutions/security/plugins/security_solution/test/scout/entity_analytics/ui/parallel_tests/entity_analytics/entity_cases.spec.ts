/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Entity attachment cases E2E tests.
 *
 * `entityAttachmentsEnabled` now defaults to `true`, so the `security.entity`
 * unified cases attachment type is registered at server boot in the default config
 * (see `server/cases/attachments/register.ts`). These tests therefore run against
 * the default config with no custom boot-time `serverArgs`.
 *
 * The Cases UI uses the unified attachment framework: there is no dedicated
 * "Entities" tab. Entity attachments render as an accordion
 * (`case-view-attachment-accordion-security.entity`) inside the consolidated
 * Attachments tab, and that accordion only renders when the case has at least one
 * entity attachment.
 *
 * Coverage:
 *  - Opening the host entity flyout and using "Add to new case" creates a
 *    `security.entity` attachment that then shows as an Entities accordion (with a
 *    count badge) in the Attachments tab.
 *  - The Entities accordion renders for attachments created via API.
 *  - A case with no entity attachments renders no Entities accordion.
 *
 * The flyout test opens the host entity flyout directly by URL (mirroring the
 * entity-flyout-anomalies suite) and seeds a single host in the entity store so it
 * resolves to a canonical `entity.id` — without which the "Add to new/existing
 * case" actions are hidden (see `use_entity_case_take_action_items.tsx`). Opening
 * the flyout directly keeps the test free of detection-rule / alert-generation
 * dependencies.
 *
 * These tests assert the Entities accordion and its count badge (rendered by the
 * cases framework from the case's attachments), not the Entity Analytics table
 * inside the accordion. The table is gated on EA index-read privileges and
 * entity-store data — Entity Analytics' concern, not the cases-attachment feature
 * under test — so this suite runs as the least-privileged `platform_engineer` role
 * (per Security Solution convention, `loginAsAdmin()` is reserved for scenarios
 * that genuinely require admin, e.g. entity-store management).
 *
 * To run locally:
 *
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/ui/parallel_tests/entity_analytics/entity_cases.spec.ts
 */

import { expect } from '@kbn/scout-security/ui';
import { spaceTest, tags } from '../../fixtures';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Seed identity for the host entity the flyout add-to-case test opens. The entity
// store is seeded with this id/name so the host flyout (opened directly by URL)
// resolves to a canonical `entity.id` and the case take-action items render.
const SEED_HOST_ENTITY_ID = 'test-entity-store-id';
const SEED_HOST_NAME = 'scout-host';

// ── Test suite ────────────────────────────────────────────────────────────────

spaceTest.describe(
  'Entity attachment cases – flyout add-to-case actions and Entities accordion',
  { tag: [...tags.stateful.classic] },
  () => {
    // The host flyout add-to-case test needs a running entity store so the seeded
    // host resolves to a canonical entity.id. Install once per worker; the other
    // two (API-driven) tests are unaffected by it being present.
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.installEntityStoreV2(['host']);
      await apiServices.entityAnalytics.indexEntityStoreEntry(SEED_HOST_ENTITY_ID, SEED_HOST_NAME);
    });

    spaceTest.beforeEach(async ({ browserAuth, apiServices, scoutSpace }) => {
      await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterEach(async ({ apiServices, scoutSpace }) => {
      await apiServices.cases.cleanup.deleteAllCases(scoutSpace.id);
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.entityAnalytics.uninstallEntityStoreV2(['host']);
    });

    spaceTest(
      'adds a host entity to a new case and the Entities accordion shows the attached entity',
      async ({ pageObjects, scoutSpace }) => {
        const { entityCases } = pageObjects;
        const caseName = `Scout entity case – host – ${scoutSpace.id}`;

        await spaceTest.step('open the host entity flyout and click Add to new case', async () => {
          await entityCases.navigateToHostFlyout(SEED_HOST_ENTITY_ID, SEED_HOST_NAME);
          await entityCases.openTakeActionMenu();
          await entityCases.clickAddToNewCase();
        });

        await spaceTest.step('create the case via the Cases flyout', async () => {
          await entityCases.fillCaseName(caseName);
          await entityCases.fillCaseDescription('Created by Scout entity attachment test');
          await entityCases.submitNewCase();
        });

        await spaceTest.step(
          'navigate to the new case and check the Entities accordion',
          async () => {
            await entityCases.clickCaseToastLink();

            await entityCases.openAttachmentsTab();
            await expect(entityCases.entityAccordion).toBeVisible();
            await expect(entityCases.entityAccordionBadge).toHaveText('1');
          }
        );
      }
    );

    spaceTest(
      'Entities accordion renders when entity attachments were added via API',
      async ({ pageObjects, entityCasesApi }) => {
        const { entityCases } = pageObjects;
        const created = await entityCasesApi.createCaseWithEntityAttachment({
          entityId: SEED_HOST_ENTITY_ID,
          entityName: SEED_HOST_NAME,
          entityType: 'host',
        });

        await entityCases.navigateToCase(created.id);

        await entityCases.openAttachmentsTab();
        await expect(entityCases.entityAccordion).toBeVisible();
        await expect(entityCases.entityAccordionBadge).toHaveText('1');
      }
    );

    spaceTest(
      'renders no Entities accordion when a case has no entity attachments',
      async ({ pageObjects, entityCasesApi }) => {
        const { entityCases } = pageObjects;
        const created = await entityCasesApi.createCase({
          description: 'No entity attachments',
          tags: [],
        });

        await entityCases.navigateToCase(created.id);

        // The Attachments tab renders; because the case has no entity attachments,
        // the framework does not render the Entities accordion at all (accordions
        // are only shown for types with a non-zero count). Assert its absence rather
        // than a per-type empty state, which no longer exists in the unified UI.
        await entityCases.openAttachmentsTab();
        await expect(entityCases.entityAccordion).toBeHidden();
      }
    );
  }
);
