/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tests the Coverage Overview MITRE ATT&CK matrix against the managed MITRE source.
// Synthetic entities at version 99.0 are seeded by global.setup.ts so the managed API
// returns only the fixture set, making assertions independent of real MITRE artifact
// version bumps.
// Seeding at version 99.0 keeps the suite independent of the shared server's real artifact data: the managed route resolves the highest version, and server-side consumers read the data client on every call, so nothing is cached across suites.

import { spaceTest, tags, CUSTOM_QUERY_RULE } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  SEEDED_ATLAS_TACTIC,
  SEEDED_ATLAS_TECHNIQUE,
  SEEDED_TACTIC_ALPHA,
  SEEDED_TACTIC_BETA,
} from '../fixtures/mitre_fixtures';

spaceTest.describe(
  'Coverage Overview — managed MITRE source',
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
      'renders the tactic matrix from the managed source',
      async ({ page, pageObjects: { coverageOverviewPage } }) => {
        await coverageOverviewPage.navigate();

        // navigate() calls waitForMatrixLoaded(), which already awaits the tactic
        // panels being non-empty and the spinner detaching — reaching these positive
        // assertions already proves the spinner resolved and no error callout replaced
        // the matrix.
        await expect(coverageOverviewPage.tacticPanels).toHaveCount(2);
        await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_ALPHA.id)).toBeVisible();
        await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_BETA.id)).toBeVisible();

        // Scanned here because the matrix has finished rendering, so the panels are stable.
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="coverageOverviewTacticPanel"]'],
        });
        expect(violations).toHaveLength(0);
      }
    );

    spaceTest(
      'renders tactics in ascending position order',
      async ({ pageObjects: { coverageOverviewPage } }) => {
        await coverageOverviewPage.navigate();

        // toHaveText verifies that the DOM column order matches the sorted model
        // (position 0 = ALPHA, position 1 = BETA). The unit test that proves the
        // model array is sorted by position cannot cover this: only a browser test
        // can confirm the renderer emits columns in model order.
        await expect(coverageOverviewPage.tacticPanels).toHaveText([
          new RegExp(SEEDED_TACTIC_ALPHA.name),
          new RegExp(SEEDED_TACTIC_BETA.name),
        ]);
      }
    );

    spaceTest(
      'does not break the matrix when the rule activity filter is changed',
      async ({ pageObjects: { coverageOverviewPage } }) => {
        await coverageOverviewPage.navigate();

        // Toggle "Disabled rules" on — the matrix must re-render without an error callout
        // and the tactic structure must remain intact.
        await coverageOverviewPage.selectActivityFilterOption('Disabled rules');

        await expect(coverageOverviewPage.errorCallout).not.toBeAttached();
        await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_ALPHA.id)).toBeVisible();
        await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_BETA.id)).toBeVisible();
      }
    );

    spaceTest(
      'shows the ATLAS matrix on the MITRE ATLAS tab with seeded tactics in position order',
      async ({ page, pageObjects: { coverageOverviewPage } }) => {
        await coverageOverviewPage.navigate();

        // EuiTab marks the selected tab with aria-selected="true".
        await expect(coverageOverviewPage.frameworkTab('enterprise')).toHaveAttribute(
          'aria-selected',
          'true'
        );
        await expect(coverageOverviewPage.frameworkTab('atlas')).toHaveAttribute(
          'aria-selected',
          'false'
        );

        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="coverageOverviewFrameworkTabs"]'],
        });
        expect(violations).toHaveLength(0);

        await coverageOverviewPage.selectFramework('atlas');
        await expect(coverageOverviewPage.frameworkTab('atlas')).toHaveAttribute(
          'aria-selected',
          'true'
        );
        await expect(coverageOverviewPage.tacticGroup(SEEDED_ATLAS_TACTIC.id)).toBeVisible();
        await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_ALPHA.id)).toHaveCount(0);
        // The ATLAS fixture set holds a single tactic (position 0), so it must be the only column.
        await expect(coverageOverviewPage.tacticPanels).toHaveText([
          new RegExp(SEEDED_ATLAS_TACTIC.name),
        ]);

        await coverageOverviewPage.selectFramework('enterprise');
        await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_ALPHA.id)).toBeVisible();
        await expect(coverageOverviewPage.tacticGroup(SEEDED_ATLAS_TACTIC.id)).toHaveCount(0);
      }
    );

    spaceTest(
      'places a rule mapped only to ATLAS in its ATLAS technique cell',
      async ({ apiServices, scoutSpace, page, pageObjects: { coverageOverviewPage } }) => {
        const ruleName = `scout-coverage-atlas-${scoutSpace.id}`;
        await apiServices.detectionRule.createCustomQueryRule({
          ...CUSTOM_QUERY_RULE,
          name: ruleName,
          rule_id: ruleName,
          enabled: false,
          threat: [
            {
              framework: 'MITRE ATLAS',
              tactic: {
                id: SEEDED_ATLAS_TACTIC.id,
                name: SEEDED_ATLAS_TACTIC.name,
                reference: SEEDED_ATLAS_TACTIC.reference,
              },
              technique: [
                {
                  id: SEEDED_ATLAS_TECHNIQUE.id,
                  name: SEEDED_ATLAS_TECHNIQUE.name,
                  reference: SEEDED_ATLAS_TECHNIQUE.reference,
                },
              ],
            },
          ],
        });

        await coverageOverviewPage.navigate();
        await coverageOverviewPage.selectActivityFilterOption('Disabled rules');

        await coverageOverviewPage.selectFramework('atlas');
        await coverageOverviewPage.openTechniquePopover(SEEDED_ATLAS_TECHNIQUE.id);
        await expect(page.testSubj.locator('coverageOverviewDisabledRulesList')).toContainText(
          ruleName
        );
        await page.keyboard.press('Escape');

        await coverageOverviewPage.selectFramework('enterprise');
        await expect(coverageOverviewPage.techniqueTitle(SEEDED_ATLAS_TECHNIQUE.id)).toHaveCount(0);
      }
    );
  }
);
