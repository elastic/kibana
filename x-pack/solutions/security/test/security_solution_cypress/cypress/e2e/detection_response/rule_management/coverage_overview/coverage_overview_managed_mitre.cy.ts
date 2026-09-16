/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Threat } from '@kbn/securitysolution-io-ts-alerting-types';
import {
  COVERAGE_OVERVIEW_LOADING_SPINNER,
  COVERAGE_OVERVIEW_MITRE_ERROR_CALLOUT,
  COVERAGE_OVERVIEW_TACTIC_PANEL,
  COVERAGE_OVERVIEW_TECHNIQUE_PANEL_IN_TACTIC_GROUP,
} from '../../../../screens/rules_coverage_overview';
import { createRule } from '../../../../tasks/api_calls/rules';
import { visit } from '../../../../tasks/navigation';
import { RULES_COVERAGE_OVERVIEW_URL } from '../../../../urls/rules_management';
import { getCustomQueryRuleParams } from '../../../../objects/rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { selectCoverageOverviewActivityFilterOption } from '../../../../tasks/rules_coverage_overview';
import {
  deleteSeededMitreEntities,
  seedMitreEntities,
  SEEDED_TACTIC_ALPHA,
  SEEDED_TECHNIQUE_ONE,
} from '../../../../tasks/api_calls/mitre_attack';

// Seeded fixture entities drive the rule threat and all assertions. Version 99.0
// sorts above any real MITRE release so the managed API returns only the synthetic
// set, making this suite independent of real artifact version bumps.

const seededRuleThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: {
    name: SEEDED_TACTIC_ALPHA.name,
    id: SEEDED_TACTIC_ALPHA.id,
    reference: SEEDED_TACTIC_ALPHA.reference,
  },
  technique: [
    {
      id: SEEDED_TECHNIQUE_ONE.id,
      reference: SEEDED_TECHNIQUE_ONE.reference,
      name: SEEDED_TECHNIQUE_ONE.name,
      subtechnique: [],
    },
  ],
};

// Tests the managed MITRE source path (xpack.mitreAttack.managedSourceEnabled=true).
//
// NOTE: This file is intentionally separate from `coverage_overview.cy.ts` (same directory)
// because `ftrConfig.kbnServerArgs` is read per spec file — the parallel runner parses only
// the first describe block's config and boots a single Kibana for the whole file. When
// `xpack.mitreAttack.managedSourceEnabled` defaults to `true` and the legacy static blob is
// removed, merge these suites into `coverage_overview.cy.ts` and delete this file.
describe(
  'Coverage overview - managed MITRE source',
  {
    tags: ['@ess', '@serverless', '@skipInServerless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          '--xpack.mitreAttack.managedSourceEnabled=true',
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'mitreAttackUpdatesUIEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      seedMitreEntities();
    });

    after(() => {
      deleteSeededMitreEntities();
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(
        getCustomQueryRuleParams({
          rule_id: 'managed_mitre_rule',
          enabled: true,
          name: 'Managed MITRE rule',
          threat: [seededRuleThreat],
        })
      );
      visit(RULES_COVERAGE_OVERVIEW_URL);
    });

    it('renders the tactic matrix after managed MITRE data loads without errors', () => {
      // The loading spinner is visible while the managed MITRE API call and the rules
      // query are in-flight. Once both resolve, the spinner disappears and the matrix renders.
      cy.get(COVERAGE_OVERVIEW_LOADING_SPINNER).should('not.exist');
      cy.get(COVERAGE_OVERVIEW_MITRE_ERROR_CALLOUT).should('not.exist');

      // At least one tactic panel must be present, and the rule's assigned tactic must appear.
      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL).should('exist');
      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL).contains(SEEDED_TACTIC_ALPHA.name);
    });

    it('renders technique cells under the correct tactic column', () => {
      cy.get(COVERAGE_OVERVIEW_LOADING_SPINNER).should('not.exist');
      cy.get(COVERAGE_OVERVIEW_MITRE_ERROR_CALLOUT).should('not.exist');

      // The technique cell appears inside the tactic group that matches the rule's tactic.
      cy.get(COVERAGE_OVERVIEW_TECHNIQUE_PANEL_IN_TACTIC_GROUP(SEEDED_TACTIC_ALPHA.id)).contains(
        SEEDED_TECHNIQUE_ONE.name
      );
    });

    it('does not break the matrix when an activity filter is changed', () => {
      cy.get(COVERAGE_OVERVIEW_LOADING_SPINNER).should('not.exist');

      // Toggle the "Disabled rules" filter on; the matrix should re-render without errors.
      selectCoverageOverviewActivityFilterOption('Disabled rules');

      cy.get(COVERAGE_OVERVIEW_MITRE_ERROR_CALLOUT).should('not.exist');
      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL).should('exist');
    });
  }
);
