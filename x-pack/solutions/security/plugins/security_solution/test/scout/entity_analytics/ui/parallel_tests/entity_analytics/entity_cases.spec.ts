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
 *    `security.entity` attachment that then shows in the Attachments tab's Entities
 *    accordion (entity table).
 *  - The Entities accordion renders the entity table for attachments created via API.
 *  - A case with no entity attachments renders no Entities accordion.
 *
 * The flyout test opens the host entity flyout directly by URL (mirroring the
 * entity-flyout-anomalies suite) and seeds a single host in the entity store so it
 * resolves to a canonical `entity.id` — without which the "Add to new/existing
 * case" actions are hidden (see `use_entity_case_take_action_items.tsx`). Opening
 * the flyout directly keeps the test free of detection-rule / alert-generation
 * dependencies.
 *
 * Tests log in as admin so the entity table has Entity Analytics index-read
 * privileges; without them the accordion renders the no-privileges callout instead
 * of the table.
 *
 * To run locally:
 *
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --testFiles x-pack/solutions/security/plugins/security_solution/test/scout/entity_analytics/ui/parallel_tests/entity_analytics/entity_cases.spec.ts
 */

import { expect } from '@kbn/scout-security/ui';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { spaceTest, tags } from '../../fixtures';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CASE_DEFAULTS = {
  connector: { id: 'none', name: 'none', type: '.none', fields: null },
  settings: { syncAlerts: false, extractObservables: false },
  owner: 'securitySolution',
} as const;

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
      await browserAuth.loginAsAdmin();
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
            await expect(entityCases.entityTabTable).toBeVisible();
          }
        );
      }
    );

    spaceTest(
      'Entities accordion renders the entity table when attachments were added via API',
      async ({ pageObjects, scoutSpace, apiServices }) => {
        const { entityCases } = pageObjects;
        const { data: created } = await apiServices.cases.create(
          {
            title: `Scout entity case – API – ${scoutSpace.id}`,
            description: 'Created by Scout entity attachment test',
            tags: ['scout'],
            ...CASE_DEFAULTS,
          },
          scoutSpace.id
        );
        // Entity attachment is a unified type not present in the shared AttachmentRequest
        // union — double-assert to bridge the gap without widening to `any`.
        type CasesCommentParam = Parameters<typeof apiServices.cases.comments.create>[1];
        await apiServices.cases.comments.create(
          created.id,
          {
            type: SECURITY_ENTITY_ATTACHMENT_TYPE,
            attachmentId: SEED_HOST_ENTITY_ID,
            metadata: { entityName: SEED_HOST_NAME, entityType: 'host' },
            owner: 'securitySolution',
          } as unknown as CasesCommentParam,
          scoutSpace.id
        );

        await entityCases.navigateToCase(created.id);

        await entityCases.openAttachmentsTab();
        await expect(entityCases.entityAccordion).toBeVisible();
        await expect(entityCases.entityTabTable).toBeVisible();
      }
    );

    spaceTest(
      'renders no Entities accordion when a case has no entity attachments',
      async ({ pageObjects, scoutSpace, apiServices }) => {
        const { entityCases } = pageObjects;
        const { data: created } = await apiServices.cases.create(
          {
            title: `Scout entity case – empty – ${scoutSpace.id}`,
            description: 'No entity attachments',
            tags: [],
            ...CASE_DEFAULTS,
          },
          scoutSpace.id
        );

        await entityCases.navigateToCase(created.id);

        // The Attachments tab renders; because the case has no entity attachments,
        // the framework does not render the Entities accordion at all (accordions
        // are only shown for types with a non-zero count). Assert its absence rather
        // than a per-type empty state, which no longer exists in the unified UI.
        await entityCases.openAttachmentsTab();
        await expect(entityCases.entityAccordion).toBeHidden();
        await expect(entityCases.entityTabTable).toBeHidden();
      }
    );
  }
);
