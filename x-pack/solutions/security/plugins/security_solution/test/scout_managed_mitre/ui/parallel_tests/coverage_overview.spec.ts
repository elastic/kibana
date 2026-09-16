/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Tests the Coverage Overview MITRE ATT&CK matrix with the managed MITRE source
// (xpack.mitreAttack.managedSourceEnabled=true). Synthetic entities at version 99.0
// are seeded by global.setup.ts so the managed API returns only the fixture set,
// making assertions independent of real MITRE artifact version bumps.
//
// Port of:
//   x-pack/solutions/security/test/security_solution_cypress/cypress/e2e/
//   detection_response/rule_management/coverage_overview/coverage_overview_managed_mitre.cy.ts
//
// NOTE: This suite intentionally lives in scout_managed_mitre rather than the
// default scout/ directory because `xpack.mitreAttack.managedSourceEnabled` is a
// boot-time flag (not dynamicConfig) that must be set before Kibana starts. Once the
// flag defaults to true and the legacy static blob is removed, merge this spec into
// the default scout UI suite and delete this directory.

import { test, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';
import {
  SEEDED_TACTIC_ALPHA,
  SEEDED_TACTIC_BETA,
  SEEDED_TECHNIQUE_ONE,
  SEEDED_TECHNIQUE_TWO,
} from '../fixtures/mitre_fixtures';

test.describe(
  'Coverage Overview — managed MITRE source',
  // Stateful/classic only: the Cypress spec this ports was @ess + @skipInServerless.
  // No serverless variant until the flag is gated per project type.
  { tag: [...tags.stateful.classic] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    test('renders the tactic matrix from the managed source without a loading spinner or error callout', async ({
      pageObjects: { coverageOverviewPage },
    }) => {
      await coverageOverviewPage.navigate();

      // The loading spinner must disappear (navigate() already waits for this).
      await expect(coverageOverviewPage.loadingSpinner).not.toBeAttached();
      await expect(coverageOverviewPage.errorCallout).not.toBeAttached();

      // Both seeded tactics must be represented as tactic panels.
      await expect(coverageOverviewPage.tacticPanels()).toHaveCount(2);
      await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_ALPHA.id)).toBeVisible();
      await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_BETA.id)).toBeVisible();
    });

    test('renders tactics in ascending position order', async ({
      pageObjects: { coverageOverviewPage },
    }) => {
      await coverageOverviewPage.navigate();

      // SEEDED_TACTIC_ALPHA has position 0, SEEDED_TACTIC_BETA has position 1.
      // The DOM order of tactic panels must match that ascending order.
      const panels = await coverageOverviewPage.tacticPanels().all();
      await expect(panels[0]).toContainText(SEEDED_TACTIC_ALPHA.name);
      await expect(panels[1]).toContainText(SEEDED_TACTIC_BETA.name);
    });

    test('binds techniques to their correct tactics — single-tactic and multi-tactic cases', async ({
      pageObjects: { coverageOverviewPage },
    }) => {
      await coverageOverviewPage.navigate();

      // SEEDED_TECHNIQUE_ONE belongs only to SEEDED_TACTIC_ALPHA (tactic_ids: ['TA9001']).
      await expect(
        coverageOverviewPage.techniqueTitleInTactic(SEEDED_TECHNIQUE_ONE.id, SEEDED_TACTIC_ALPHA.id)
      ).toBeAttached();
      await expect(
        coverageOverviewPage.techniqueTitleInTactic(SEEDED_TECHNIQUE_ONE.id, SEEDED_TACTIC_BETA.id)
      ).not.toBeAttached();

      // SEEDED_TECHNIQUE_TWO belongs to both tactics (tactic_ids: ['TA9001', 'TA9002']).
      await expect(
        coverageOverviewPage.techniqueTitleInTactic(SEEDED_TECHNIQUE_TWO.id, SEEDED_TACTIC_ALPHA.id)
      ).toBeAttached();
      await expect(
        coverageOverviewPage.techniqueTitleInTactic(SEEDED_TECHNIQUE_TWO.id, SEEDED_TACTIC_BETA.id)
      ).toBeAttached();
    });

    test('does not break the matrix when the rule activity filter is changed', async ({
      pageObjects: { coverageOverviewPage },
    }) => {
      await coverageOverviewPage.navigate();

      // Toggle "Disabled rules" on — the matrix must re-render without an error callout
      // and the tactic structure must remain intact.
      await coverageOverviewPage.selectActivityFilterOption('Disabled rules');

      await expect(coverageOverviewPage.errorCallout).not.toBeAttached();
      await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_ALPHA.id)).toBeVisible();
      await expect(coverageOverviewPage.tacticGroup(SEEDED_TACTIC_BETA.id)).toBeVisible();
    });
  }
);
