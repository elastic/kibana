/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewThreatIndicatorRule } from '../../../../objects/rule';

import {
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_MISSING_FIELD,
  DEFINITION_DETAILS,
  ALERT_SUPPRESSION_INSUFFICIENT_LICENSING_ICON,
} from '../../../../screens/rule_details';

import { startBasicLicense } from '../../../../tasks/api_calls/licensing';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { TOOLTIP } from '../../../../screens/common';
import { ruleDetailsUrl } from '../../../../urls/rule_details';
import { getDetails } from '../../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

const SUPPRESS_BY_FIELDS = ['myhash.mysha256', 'source.ip.keyword'];

describe(
  'Detection rules, Indicator Match, Alert Suppression',
  {
    tags: ['@ess'],
  },
  () => {
    describe('Create rule form', () => {
      beforeEach(() => {
        deleteAlertsAndRules();
        login();
        visit(CREATE_RULE_URL);
        startBasicLicense();
      });

      it('shows upselling message on rule details with suppression on basic license', () => {
        const rule = getNewThreatIndicatorRule();

        createRule({
          ...rule,
          alert_suppression: {
            group_by: SUPPRESS_BY_FIELDS,
            duration: { value: 360, unit: 's' },
            missing_fields_strategy: 'doNotSuppress',
          },
        }).then((createdRule) => {
          visit(ruleDetailsUrl(createdRule.body.id));

          cy.get(DEFINITION_DETAILS).within(() => {
            getDetails(SUPPRESS_BY_DETAILS).should('have.text', SUPPRESS_BY_FIELDS.join(''));
            getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '360s');
            getDetails(SUPPRESS_MISSING_FIELD).should(
              'have.text',
              'Do not suppress alerts for events with missing fields'
            );
          });

          // Platinum license is required for configuration to apply
          cy.get(ALERT_SUPPRESSION_INSUFFICIENT_LICENSING_ICON).eq(2).trigger('mouseover');
          cy.get(TOOLTIP).contains(
            'Alert suppression is configured but will not be applied due to insufficient licensing'
          );
        });
      });
    });
  }
);
