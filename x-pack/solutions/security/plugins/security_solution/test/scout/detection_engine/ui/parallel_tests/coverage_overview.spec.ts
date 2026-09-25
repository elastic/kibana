/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tests the Coverage Overview MITRE ATT&CK matrix against the managed MITRE source,
// which is the default (xpack.mitreAttack.managedSourceEnabled defaults to true).
// Synthetic entities at version 99.0 are seeded by global.setup.ts so the managed API
// returns only the fixture set, making assertions independent of real MITRE artifact
// version bumps.

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import { SEEDED_TACTIC_ALPHA, SEEDED_TACTIC_BETA } from '../fixtures/mitre_fixtures';

spaceTest.describe(
  'Coverage Overview — managed MITRE source',
  { tag: tags.stateful.classic },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
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
  }
);
