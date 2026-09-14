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

// Hard-coded fixture: Credential Access (TA0006) / OS Credential Dumping (T1003).
// These IDs exist in MITRE ATT&CK v19.1 and are served by both the static blob and
// the managed API, so assertions remain valid regardless of source.
const FIXTURE_TACTIC = {
  name: 'Credential Access',
  id: 'TA0006',
  reference: 'https://attack.mitre.org/tactics/TA0006/',
};
const FIXTURE_TECHNIQUE = {
  name: 'OS Credential Dumping',
  id: 'T1003',
  reference: 'https://attack.mitre.org/techniques/T1003/',
};

const MockRuleThreat: Threat = {
  framework: 'MITRE ATT&CK',
  tactic: FIXTURE_TACTIC,
  technique: [
    {
      id: FIXTURE_TECHNIQUE.id,
      reference: FIXTURE_TECHNIQUE.reference,
      name: FIXTURE_TECHNIQUE.name,
      subtechnique: [],
    },
  ],
};

// Tests the managed MITRE source path (xpack.mitreAttack.managedSourceEnabled=true).
// Hard-coded fixtures (Credential Access / OS Credential Dumping) are used so that
// this spec remains valid after the static blob is removed.
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
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      createRule(
        getCustomQueryRuleParams({
          rule_id: 'managed_mitre_rule',
          enabled: true,
          name: 'Managed MITRE rule',
          threat: [MockRuleThreat],
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
      cy.get(COVERAGE_OVERVIEW_TACTIC_PANEL).contains(FIXTURE_TACTIC.name);
    });

    it('renders technique cells under the correct tactic column', () => {
      cy.get(COVERAGE_OVERVIEW_LOADING_SPINNER).should('not.exist');
      cy.get(COVERAGE_OVERVIEW_MITRE_ERROR_CALLOUT).should('not.exist');

      // The technique cell appears inside the tactic group that matches the rule's tactic.
      cy.get(COVERAGE_OVERVIEW_TECHNIQUE_PANEL_IN_TACTIC_GROUP(FIXTURE_TACTIC.id)).contains(
        FIXTURE_TECHNIQUE.name
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
