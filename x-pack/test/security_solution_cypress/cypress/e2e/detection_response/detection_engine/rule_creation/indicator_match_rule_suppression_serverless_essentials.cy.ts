/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThreatIndicatorRule } from '../../../../objects/rule';

import { DEFINITION_DETAILS, SUPPRESS_BY_DETAILS } from '../../../../screens/rule_details';

import {
  fillDefineIndicatorMatchRule,
  fillAlertSuppressionFields,
  selectIndicatorMatchType,
  fillAboutRuleMinimumAndContinue,
  createRuleWithoutEnabling,
  skipScheduleRuleAction,
  continueFromDefineStep,
} from '../../../../tasks/create_new_rule';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { getDetails } from '../../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

const SUPPRESS_BY_FIELDS = ['myhash.mysha256', 'source.ip.keyword'];

describe(
  'Detection rules, Indicator Match, Alert Suppression',
  {
    tags: ['@serverless'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  },
  () => {
    const rule = getNewThreatIndicatorRule();
    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'threat_indicator' });
      cy.task('esArchiverLoad', { archiveName: 'suspicious_source_event' });
      deleteAlertsAndRules();
      login();
    });

    it('creates rule with per rule execution suppression for essentials license', () => {
      visit(CREATE_RULE_URL);
      selectIndicatorMatchType();
      fillDefineIndicatorMatchRule(rule);

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
