/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEqlRule } from '../../../../objects/rule';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { getDetails } from '../../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  fillAlertSuppressionFields,
  fillAboutRuleMinimumAndContinue,
  createRuleWithoutEnabling,
  skipScheduleRuleAction,
  continueFromDefineStep,
  fillDefineEqlRule,
  selectEqlRuleType,
} from '../../../../tasks/create_new_rule';

import { DEFINITION_DETAILS, SUPPRESS_BY_DETAILS } from '../../../../screens/rule_details';

const SUPPRESS_BY_FIELDS = ['agent.type'];

describe(
  'Detection rules, Event Correlation, Alert Suppression',
  {
    tags: ['@serverless'],
    // alertSuppressionForNonSequenceEqlRuleEnabled feature flag is also enabled in a global config
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'alertSuppressionForNonSequenceEqlRuleEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    const rule = getEqlRule();
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
    });
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
    });
    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
    });
    it('creates rule with per rule execution suppression for essentials license for non-sequence based alerts', () => {
      visit(CREATE_RULE_URL);
      selectEqlRuleType();
      fillDefineEqlRule(rule);

      // selecting only suppression fields, the rest options would be default
      fillAlertSuppressionFields(SUPPRESS_BY_FIELDS);
      continueFromDefineStep();

      fillAboutRuleMinimumAndContinue(rule);
      skipScheduleRuleAction();
      createRuleWithoutEnabling();

      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
      });
    });
  }
);
