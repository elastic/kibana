/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ABOUT_CONTINUE_BTN,
  DEFINE_CONTINUE_BUTTON,
  MITRE_ATTACK_ADD_TACTIC_BUTTON,
  MITRE_ATTACK_LOADING,
  MITRE_ATTACK_TACTIC_DROPDOWN,
  SCHEDULE_CONTINUE_BUTTON,
} from '../../../../screens/create_new_rule';
import {
  ABOUT_DETAILS,
  MITRE_ATTACK_DETAILS,
  RULE_NAME_HEADER,
} from '../../../../screens/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  createAndEnableRule,
  expandAdvancedSettings,
  fillCustomQueryInput,
  fillRuleName,
  fillThreat,
  fillThreatTechnique,
} from '../../../../tasks/create_new_rule';
import { getDetails } from '../../../../tasks/rule_details';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { ruleFields } from '../../../../data/detection_engine';

// Tests the managed MITRE source path (xpack.mitreAttack.managedSourceEnabled=true)
// for the rule creation MITRE ATT&CK threat picker. The managed API serves the same
// MITRE v19.1 content as the static blob, so ruleFields.threat (Credential Access /
// TA0006) is a valid selection under both sources.
//
// NOTE: This file is intentionally separate from `common_flows.cy.ts` (same directory),
// which covers the MITRE picker under the default (static blob) source, because
// `ftrConfig.kbnServerArgs` is read per spec file — the parallel runner parses only the
// first describe block's config and boots a single Kibana for the whole file. When
// `xpack.mitreAttack.managedSourceEnabled` defaults to `true` and the legacy static blob
// is removed, merge these suites into `common_flows.cy.ts` and delete this file.
describe(
  'Rule creation MITRE picker - managed MITRE source',
  {
    tags: ['@ess'],
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
      visit(CREATE_RULE_URL);
    });

    it('loads tactics from the managed MITRE API and persists a tactic/technique selection after rule save', () => {
      const ruleName = 'Managed MITRE picker test rule';

      // --- Define step ---
      fillCustomQueryInput('host.name: *');
      cy.get(DEFINE_CONTINUE_BUTTON).click();

      // --- About step ---
      fillRuleName(ruleName);
      expandAdvancedSettings();

      // When managedSourceEnabled is true the picker shows a loading spinner while the
      // managed API call is in-flight. Wait for it to resolve before interacting.
      cy.get(MITRE_ATTACK_LOADING).should('not.exist');

      // Tactic dropdown and "Add tactic" button are present once MITRE data is loaded.
      cy.get(MITRE_ATTACK_ADD_TACTIC_BUTTON).should('exist');
      cy.get(MITRE_ATTACK_TACTIC_DROPDOWN).should('exist');

      // Select tactic (Credential Access / TA0006) then add a technique
      // (OS Credential Dumping / T1003) using the standard helper tasks.
      fillThreat(ruleFields.threat);
      fillThreatTechnique();

      cy.get(ABOUT_CONTINUE_BTN).click();

      // --- Schedule step ---
      cy.get(SCHEDULE_CONTINUE_BUTTON).click();

      // --- Create the rule ---
      createAndEnableRule();

      // --- Verify the saved rule contains the MITRE threat ---
      cy.get(RULE_NAME_HEADER).should('contain', ruleName);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(MITRE_ATTACK_DETAILS).should('contain', ruleFields.threat.tactic.name);
        getDetails(MITRE_ATTACK_DETAILS).should('contain', 'OS Credential Dumping');
      });
    });
  }
);
