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

import { ALERT_SUPPRESSION_FIELDS_INPUT } from '../../../../screens/create_new_rule';

describe(
  'Detection Rule Creation - EQL Rules - With Alert Suppression',
  {
    // skipped in MKI as it depends on feature flag alertSuppressionForEsqlRuleEnabled
    // alertSuppressionForEsqlRuleEnabled feature flag is also enabled in a global config
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      kbnServerArgs: [
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'alertSuppressionForSequenceEqlRuleEnabled',
        ])}`,
      ],
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

      it('displays the suppression fields', () => {
        cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).should('be.enabled');
      });
    });
  }
);
