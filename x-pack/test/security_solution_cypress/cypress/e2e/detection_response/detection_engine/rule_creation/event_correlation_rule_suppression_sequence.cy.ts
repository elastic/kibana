/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEqlSequenceRule } from '../../../../objects/rule';

import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { fillDefineEqlRule, selectEqlRuleType } from '../../../../tasks/create_new_rule';

import { TOOLTIP } from '../../../../screens/common';
import {
  ALERT_SUPPRESSION_FIELDS,
  ALERT_SUPPRESSION_FIELDS_INPUT,
} from '../../../../screens/create_new_rule';

describe(
  'Detection Rule Creation - EQL Rules - With Alert Suppression',
  {
    tags: ['@ess', '@serverless'],
    // alertSuppressionForNonSequenceEqlRuleEnabled feature flag is also enabled in a global config
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'alertSuppressionForNonSequenceEqlRuleEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    describe('with sequence queries ', () => {
      const rule = getEqlSequenceRule();

      beforeEach(() => {
        deleteAlertsAndRules();
        login();
        visit(CREATE_RULE_URL);

        selectEqlRuleType();
        fillDefineEqlRule(rule);
      });

      it('disables the suppression fields and presents an informative tooltip', () => {
        cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).should('be.disabled');

        cy.get(ALERT_SUPPRESSION_FIELDS).trigger('mouseover');
        cy.get(TOOLTIP).contains('Suppression is not supported for EQL sequence queries.');
      });
    });
  }
);
