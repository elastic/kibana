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
import { selectEqlRuleType } from '../../../../tasks/create_new_rule';
import {
  ALERT_SUPPRESSION_FIELDS_INPUT,
  ALERT_SUPPRESSION_FIELDS,
} from '../../../../screens/create_new_rule';
import {
  DEFINITION_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_MISSING_FIELD,
  DETAILS_TITLE,
  ALERT_SUPPRESSION_INSUFFICIENT_LICENSING_ICON,
} from '../../../../screens/rule_details';
import { startBasicLicense } from '../../../../tasks/api_calls/licensing';
import { createRule } from '../../../../tasks/api_calls/rules';
import { TOOLTIP } from '../../../../screens/common';
import { ruleDetailsUrl } from '../../../../urls/rule_details';

const SUPPRESS_BY_FIELDS = ['agent.type'];

describe(
  'Detection rules, Event Correlation, Alert Suppression',
  {
    tags: ['@ess'],
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
    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      visit(CREATE_RULE_URL);
      startBasicLicense();
    });
    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
    });

    it('can not create rule with rule execution suppression on basic license for non-sequence based alerts', () => {
      selectEqlRuleType();

      cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).should('be.disabled');
      cy.get(ALERT_SUPPRESSION_FIELDS).trigger('mouseover');

      // Platinum license is required, tooltip on disabled alert suppression checkbox should tell this
      cy.get(TOOLTIP).contains('Platinum license');
    });

    it('shows upselling message on rule details with suppression on basic license', () => {
      const rule = getEqlRule();

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

          // suppression functionality should be under Tech Preview
          cy.contains(DETAILS_TITLE, SUPPRESS_FOR_DETAILS).contains('Technical Preview');
        });

        // Platinum license is required for configuration to apply
        cy.get(ALERT_SUPPRESSION_INSUFFICIENT_LICENSING_ICON).eq(2).trigger('mouseover');
        cy.get(TOOLTIP).contains(
          'Alert suppression is configured but will not be applied due to insufficient licensing'
        );
      });
    });
  }
);
