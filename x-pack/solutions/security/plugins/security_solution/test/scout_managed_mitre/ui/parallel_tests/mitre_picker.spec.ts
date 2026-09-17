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
// NOTE: This suite intentionally lives in scout_managed_mitre rather than the
// default scout/ directory because `xpack.mitreAttack.managedSourceEnabled` is a
// boot-time flag (not dynamicConfig) that must be set before Kibana starts. Once the
// flag defaults to true and the legacy static blob is removed, merge this spec into
// the default scout UI suite and delete this directory.

import { spaceTest } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  SEEDED_TACTIC_ALPHA,
  SEEDED_TECHNIQUE_ONE,
  SEEDED_SUBTECHNIQUE_ONE,
} from '../fixtures/mitre_fixtures';
import { LOCAL_MANAGED_MITRE_TAGS } from '../fixtures/tags';

const RULE_NAME = 'Managed MITRE picker test rule';
const RULE_DESCRIPTION = 'Verifies the managed MITRE API populates the tactic/technique picker.';
const DEFINE_QUERY = 'host.name: *';

spaceTest.describe(
  'Rule creation MITRE picker — managed MITRE source',
  { tag: LOCAL_MANAGED_MITRE_TAGS },
  () => {
    // Clean up any rule left by a previous crashed run before this worker's test
    // runs. The seeded mitre-attack-entity saved objects are space-agnostic
    // (namespaceType: 'agnostic') and live in every space, so only rule cleanup
    // needs space scoping — which spaceTest handles automatically.
    spaceTest.beforeAll(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    // The rule is created through the UI. Deleting it after the test prevents
    // the leftover rule from bleeding into retries or the sibling coverage spec.
    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest(
      'loads tactics from the managed MITRE API and persists a tactic/technique/subtechnique selection after rule save',
      async ({ page, pageObjects: { ruleCreateWizard } }) => {
        // Walk Define → About → Schedule via the page-object helper. The MITRE
        // interactions happen inside onAboutStep, which is called after the About
        // fields are filled and before the About "Continue" button is clicked.
        await ruleCreateWizard.completeUntilActionsStep({
          name: RULE_NAME,
          description: RULE_DESCRIPTION,
          query: DEFINE_QUERY,
          onAboutStep: async () => {
            await spaceTest.step(
              'Advanced settings: expand to reach the MITRE picker',
              async () => {
                await ruleCreateWizard.expandAdvancedSettings();

                // When managedSourceEnabled is true the picker shows a loading spinner while
                // the managed API call is in-flight. waitForMitreLoaded() waits for the
                // "Add tactic" button (rendered only after entities resolve) and then
                // confirms the spinner is gone — no separate toBeVisible assertion needed.
                await ruleCreateWizard.waitForMitreLoaded();
              }
            );

            // Scoped to the MITRE picker rather than the whole advanced-settings
            // block, which trips an unfixed `label` violation on the unlabelled
            // `euiFieldText` inputs in the references / false positives add-item
            // rows. Widen once those carry labels.
            await spaceTest.step('a11y check: MITRE tactic picker', async () => {
              const { violations } = await page.checkA11y({
                include: ['[data-test-subj="mitreAttackTactic"]'],
              });
              expect(violations).toHaveLength(0);
            });

            await spaceTest.step('Select the seeded tactic', async () => {
              // The initial state has one tactic row (value "none"). Select the seeded
              // tactic by its ID; the select option value is the entity id.
              await ruleCreateWizard.selectMitreTacticById(SEEDED_TACTIC_ALPHA.id);
            });

            await spaceTest.step('Add and select the seeded technique', async () => {
              await ruleCreateWizard.addAndSelectMitreTechniqueById(SEEDED_TECHNIQUE_ONE.id);
            });

            await spaceTest.step('Add and select the seeded subtechnique', async () => {
              // Exercises the tactic → technique → subtechnique cascade, which resolves
              // subtechniques by technique_id rather than by tactic name.
              await ruleCreateWizard.addAndSelectMitreSubtechniqueById(SEEDED_SUBTECHNIQUE_ONE.id);
            });
          },
        });

        await spaceTest.step('Create rule without enabling', async () => {
          // createWithoutEnablingRule() clicks "create-enabled-false" and waits for
          // ruleDetailsTitle to become visible — no need for a disabled rule to execute
          // host.name:* on a schedule and generate background load on the shared stack.
          await ruleCreateWizard.createWithoutEnablingRule();
        });

        await spaceTest.step('Assert the saved rule contains the seeded MITRE threat', async () => {
          // After creation Kibana navigates to the rule detail page.
          // ruleDetailsTitle visibility is already guaranteed by createWithoutEnablingRule().
          await expect(ruleCreateWizard.ruleDetailsTitle).toContainText(RULE_NAME);
          await expect(ruleCreateWizard.savedThreatTactics).toContainText(SEEDED_TACTIC_ALPHA.name);
          await expect(ruleCreateWizard.savedThreatTechniques).toContainText(
            SEEDED_TECHNIQUE_ONE.name
          );
          // threatSubtechniqueLink exists in
          // public/detection_engine/rule_creation_ui/components/description_step/threat_description.tsx.
          // Asserting via page.testSubj directly (not promoted to the page object yet —
          // add it to RuleCreateWizardPage.savedThreatSubtechniques when a second caller appears).
          await expect(
            page.testSubj.locator('aboutRule').getByTestId('threatSubtechniqueLink')
          ).toContainText(SEEDED_SUBTECHNIQUE_ONE.name);
        });
      }
    );
  }
);
