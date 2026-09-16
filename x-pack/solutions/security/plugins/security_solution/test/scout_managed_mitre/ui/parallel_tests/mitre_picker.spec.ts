/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tests the managed MITRE source path (xpack.mitreAttack.managedSourceEnabled=true)
// for the rule creation MITRE ATT&CK threat picker. Synthetic entities at version 99.0
// are seeded by global.setup.ts so the managed API returns only the fixture set, making
// assertions independent of real MITRE artifact version bumps.
//
// Port of:
//   x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/
//   detection_response/detection_engine/rule_creation/mitre_picker_managed.cy.ts
//
// NOTE: This suite intentionally lives in scout_managed_mitre rather than the
// default scout/ directory because `xpack.mitreAttack.managedSourceEnabled` is a
// boot-time flag (not dynamicConfig) that must be set before Kibana starts. Once the
// flag defaults to true and the legacy static blob is removed, merge this spec into
// the default scout UI suite and delete this directory.

import { test, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { SEEDED_TACTIC_ALPHA, SEEDED_TECHNIQUE_ONE } from '../fixtures/mitre_fixtures';

const RULE_NAME = 'Managed MITRE picker test rule';
const RULE_DESCRIPTION = 'Verifies the managed MITRE API populates the tactic/technique picker.';
const DEFINE_QUERY = 'host.name: *';

test.describe(
  'Rule creation MITRE picker — managed MITRE source',
  // Stateful/classic only: the Cypress spec this ports was @ess + @skipInServerless.
  // No serverless variant until the flag is gated per project type.
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test('loads tactics from the managed MITRE API and persists a tactic/technique selection after rule save', async ({
      page,
      pageObjects: { ruleCreateWizard },
    }) => {
      // --- Navigate to rule creation ---
      await page.gotoApp('security/rules/create');
      await ruleCreateWizard.defineStep.waitFor({ state: 'visible', timeout: 60_000 });

      // --- Define step: custom query ---
      await ruleCreateWizard.queryInput.and(page.locator(':enabled')).waitFor({
        state: 'visible',
        timeout: 60_000,
      });
      await ruleCreateWizard.queryInput.click();
      await ruleCreateWizard.queryInput.pressSequentially(DEFINE_QUERY);
      await page.keyboard.press('Enter');
      await ruleCreateWizard.defineContinue.click();

      // --- About step: fill required fields ---
      await ruleCreateWizard.aboutRuleName.waitFor({ state: 'visible' });
      await ruleCreateWizard.aboutRuleName.fill(RULE_NAME);
      // Description is required — omitting it causes a validation error on continue.
      await ruleCreateWizard.aboutRuleDescription.fill(RULE_DESCRIPTION);

      // --- Advanced settings: expand to reach the MITRE picker ---
      await ruleCreateWizard.expandAdvancedSettings();

      // When managedSourceEnabled is true the picker shows a loading spinner while
      // the managed API call is in-flight. Wait for it to resolve before interacting.
      await ruleCreateWizard.waitForMitreLoaded();

      // Verify the MITRE UI is rendered and the "Add tactic" button is present.
      await expect(ruleCreateWizard.addMitreTacticButton).toBeVisible();

      // --- Select the seeded tactic ---
      // The initial state already has one tactic row (with value "none"). Select
      // the seeded tactic by its ID; the select value is the entity id.
      await ruleCreateWizard.selectMitreTacticById(SEEDED_TACTIC_ALPHA.id);

      // --- Add and select the seeded technique ---
      await ruleCreateWizard.addAndSelectMitreTechniqueById(SEEDED_TECHNIQUE_ONE.id);

      // --- Continue through About → Schedule ---
      await ruleCreateWizard.aboutContinue.click();
      await ruleCreateWizard.scheduleContinue.waitFor({ state: 'visible' });
      await ruleCreateWizard.scheduleContinue.click();

      // --- Create and enable the rule ---
      await ruleCreateWizard.createAndEnableRule();

      // --- Assert the saved rule contains the seeded MITRE threat ---
      // After creation Kibana navigates to the rule detail page.
      const ruleNameHeader = page.locator('[data-test-subj="header-page-title"]');
      await expect(ruleNameHeader).toContainText(RULE_NAME, { timeout: 30_000 });

      // The About section lists MITRE data in a description list. Find the row
      // whose title is "MITRE ATT&CK" and assert the tactic and technique names.
      const aboutSection = page.testSubj.locator('aboutRule');
      const mitreRow = aboutSection
        .locator('[data-test-subj="listItemColumnStepRuleDescription"]')
        .filter({
          has: page.locator('.euiDescriptionList__title', { hasText: 'MITRE ATT&CK' }),
        });

      await expect(mitreRow).toContainText(SEEDED_TACTIC_ALPHA.name);
      await expect(mitreRow).toContainText(SEEDED_TECHNIQUE_ONE.name);
    });
  }
);
