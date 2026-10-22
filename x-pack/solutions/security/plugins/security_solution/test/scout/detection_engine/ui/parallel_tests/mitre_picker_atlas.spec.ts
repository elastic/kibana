/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tests the rule creation MITRE ATLAS framework picker against the managed MITRE source.
// Synthetic entities at version 99.0 are seeded by global.setup.ts so the managed API
// returns only the fixture set, making assertions independent of real MITRE artifact
// version bumps.

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  SEEDED_TACTIC_ALPHA,
  SEEDED_TECHNIQUE_ONE,
  SEEDED_ATLAS_TACTIC,
  SEEDED_ATLAS_TECHNIQUE,
  SEEDED_ATLAS_SUBTECHNIQUE,
} from '../fixtures/mitre_fixtures';

const ATLAS_RULE_NAME = 'Managed MITRE ATLAS picker test rule';
const ATLAS_EDIT_RULE_NAME = 'Managed MITRE ATLAS edit test rule';
const ATLAS_EDIT_RENAMED_RULE_NAME = 'Managed MITRE ATLAS edit test rule renamed';
const RULE_DESCRIPTION = 'Verifies the managed MITRE API populates the tactic/technique picker.';
const DEFINE_QUERY = 'host.name: *';

spaceTest.describe(
  'Rule creation MITRE picker — MITRE ATLAS framework',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeEach(async ({ apiServices, browserAuth }) => {
      await apiServices.detectionRule.deleteAll();
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.detectionRule.deleteAll();
    });

    spaceTest(
      'persists MITRE ATT&CK and MITRE ATLAS mappings together after rule save',
      async ({ page, apiServices, pageObjects: { ruleCreateWizard } }) => {
        await ruleCreateWizard.completeUntilActionsStep({
          name: ATLAS_RULE_NAME,
          description: RULE_DESCRIPTION,
          query: DEFINE_QUERY,
          onAboutStep: async () => {
            await spaceTest.step(
              'Advanced settings: expand to reach the MITRE picker',
              async () => {
                await ruleCreateWizard.expandAdvancedSettings();
                await ruleCreateWizard.waitForMitreLoaded();
              }
            );

            await spaceTest.step('Select an enterprise tactic and technique', async () => {
              await ruleCreateWizard.selectMitreTacticByIdInSection(
                'enterprise',
                SEEDED_TACTIC_ALPHA.id
              );
              await ruleCreateWizard.addAndSelectMitreTechniqueByIdInSection(
                'enterprise',
                SEEDED_TECHNIQUE_ONE.id
              );
            });

            await spaceTest.step('Add the ATLAS framework', async () => {
              await ruleCreateWizard.addMitreFramework('atlas');
              await expect(ruleCreateWizard.mitreFrameworkSection('atlas')).toBeVisible();
              await expect(ruleCreateWizard.mitreFrameworkSection('enterprise')).toBeVisible();
            });

            await spaceTest.step('a11y check: MITRE picker with both frameworks', async () => {
              const { violations } = await page.checkA11y({
                include: [
                  '[data-test-subj="mitreFrameworkSection-enterprise"]',
                  '[data-test-subj="mitreFrameworkSection-atlas"]',
                ],
              });
              expect(violations).toHaveLength(0);
            });

            await spaceTest.step('Select the seeded ATLAS tactic', async () => {
              await ruleCreateWizard.selectMitreTacticByIdInSection(
                'atlas',
                SEEDED_ATLAS_TACTIC.id
              );
            });

            await spaceTest.step('Add and select the seeded ATLAS technique', async () => {
              await ruleCreateWizard.addAndSelectMitreTechniqueByIdInSection(
                'atlas',
                SEEDED_ATLAS_TECHNIQUE.id
              );
            });

            await spaceTest.step('Add and select the seeded ATLAS subtechnique', async () => {
              await ruleCreateWizard.addAndSelectMitreSubtechniqueByIdInSection(
                'atlas',
                SEEDED_ATLAS_SUBTECHNIQUE.id
              );
            });
          },
        });

        await spaceTest.step('Create rule without enabling', async () => {
          await ruleCreateWizard.createWithoutEnablingRule();
        });

        await spaceTest.step('Assert the saved rule contains both frameworks', async () => {
          await expect(ruleCreateWizard.ruleDetailsTitle).toContainText(ATLAS_RULE_NAME);
          const enterpriseGroup = ruleCreateWizard.savedThreatFrameworkGroup('enterprise');
          await expect(enterpriseGroup).toBeVisible();
          await expect(
            enterpriseGroup.locator('[data-test-subj="threatTacticLink"]')
          ).toContainText(SEEDED_TACTIC_ALPHA.name);
          const atlasGroup = ruleCreateWizard.savedThreatFrameworkGroup('atlas');
          await expect(atlasGroup).toBeVisible();
          await expect(atlasGroup.locator('[data-test-subj="threatTacticLink"]')).toContainText(
            SEEDED_ATLAS_TACTIC.name
          );
          await expect(atlasGroup.locator('[data-test-subj="threatTechniqueLink"]')).toContainText(
            SEEDED_ATLAS_TECHNIQUE.name
          );
          await expect(
            atlasGroup.locator('[data-test-subj="threatSubtechniqueLink"]')
          ).toContainText(SEEDED_ATLAS_SUBTECHNIQUE.name);

          // The details URL is `/rules/id/<ruleId>/<tab>`. Both the enterprise and
          // ATLAS mappings persist as separate threat entries.
          const ruleId = new URL(page.url()).pathname.match(/\/rules\/id\/([^/]+)/)?.[1] ?? '';
          const rule = await apiServices.detectionRule.getById(ruleId);
          const threats = rule.threat ?? [];
          const enterpriseThreat = threats.find(({ framework }) => framework === 'MITRE ATT&CK');
          const atlasThreat = threats.find(({ framework }) => framework === 'MITRE ATLAS');
          expect(threats).toHaveLength(2);
          expect(enterpriseThreat?.tactic.id).toBe(SEEDED_TACTIC_ALPHA.id);
          if (!atlasThreat) throw new Error('Expected a MITRE ATLAS threat entry');
          expect(atlasThreat.tactic.id).toBe(SEEDED_ATLAS_TACTIC.id);
          expect(atlasThreat.technique?.[0].id).toBe(SEEDED_ATLAS_TECHNIQUE.id);
          expect(atlasThreat.technique?.[0].subtechnique?.[0].id).toBe(
            SEEDED_ATLAS_SUBTECHNIQUE.id
          );
        });
      }
    );

    spaceTest(
      'preserves the MITRE ATLAS framework when a rule is edited without touching its threat mappings',
      async ({ apiServices, pageObjects: { ruleCreateWizard } }) => {
        const { id: ruleId } = await apiServices.detectionRule.createCustomQueryRule({
          ...CUSTOM_QUERY_RULE,
          rule_id: 'managed-mitre-atlas-edit-rule',
          name: ATLAS_EDIT_RULE_NAME,
          description: RULE_DESCRIPTION,
          enabled: false,
          threat: [
            {
              framework: 'MITRE ATLAS',
              tactic: {
                id: SEEDED_ATLAS_TACTIC.id,
                name: SEEDED_ATLAS_TACTIC.name,
                reference: SEEDED_ATLAS_TACTIC.reference,
              },
              technique: [],
            },
          ],
        });

        await spaceTest.step('Edit the rule name and save', async () => {
          await ruleCreateWizard.gotoEditAbout(ruleId);
          await ruleCreateWizard.renameAndSaveEditedRule(ATLAS_EDIT_RENAMED_RULE_NAME);
        });

        await spaceTest.step('Assert the ATLAS framework is preserved', async () => {
          await expect(ruleCreateWizard.ruleDetailsTitle).toContainText(
            ATLAS_EDIT_RENAMED_RULE_NAME
          );
          await expect(ruleCreateWizard.savedThreatFrameworkGroup('atlas')).toBeVisible();
          const rule = await apiServices.detectionRule.getById(ruleId);
          expect(rule.threat?.[0].framework).toBe('MITRE ATLAS');
          expect(rule.threat?.[0].tactic.id).toBe(SEEDED_ATLAS_TACTIC.id);
        });
      }
    );
  }
);
