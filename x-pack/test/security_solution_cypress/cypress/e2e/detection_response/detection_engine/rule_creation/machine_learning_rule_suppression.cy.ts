/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMachineLearningRule } from '../../../../objects/rule';
import {
  DEFINITION_DETAILS,
  DETAILS_TITLE,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_MISSING_FIELD,
} from '../../../../screens/rule_details';
import {
  continueFromDefineStep,
  fillAlertSuppressionFields,
  fillDefineMachineLearningRule,
  selectMachineLearningRuleType,
  selectAlertSuppressionPerInterval,
  setAlertSuppressionDuration,
  selectDoNotSuppressForMissingFields,
  skipScheduleRuleAction,
  fillAboutRuleMinimumAndContinue,
  createRuleWithoutEnabling,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { getDetails } from '../../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe(
  'Machine Learning Detection Rules - Creation',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'alertSuppressionForMachineLearningRuleEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    let mlRule: ReturnType<typeof getMachineLearningRule>;
    const suppressByFields = ['agent.name', 'host.name'];

    beforeEach(() => {
      login();
      visit(CREATE_RULE_URL);
      mlRule = getMachineLearningRule();
      selectMachineLearningRuleType();
      fillDefineMachineLearningRule(mlRule);
    });

    describe('with Alert Suppression', () => {
      it('allows a rule with per-execution suppression to be created and displayed', () => {
        fillAlertSuppressionFields(suppressByFields);
        continueFromDefineStep();

        // ensures details preview works correctly
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', suppressByFields.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Suppress and group alerts for events with missing fields'
          );

          // suppression functionality should be under Tech Preview
          cy.contains(DETAILS_TITLE, SUPPRESS_FOR_DETAILS).contains('Technical Preview');
        });

        fillAboutRuleMinimumAndContinue(mlRule);
        skipScheduleRuleAction();
        createRuleWithoutEnabling();

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', suppressByFields.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Suppress and group alerts for events with missing fields'
          );
        });
      });

      it('allows a rule with interval suppression to be created and displayed', () => {
        fillAlertSuppressionFields(suppressByFields);
        selectAlertSuppressionPerInterval();
        setAlertSuppressionDuration(45, 'm');
        selectDoNotSuppressForMissingFields();
        continueFromDefineStep();

        // ensures details preview works correctly
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', suppressByFields.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '45m');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Do not suppress alerts for events with missing fields'
          );

          // suppression functionality should be under Tech Preview
          cy.contains(DETAILS_TITLE, SUPPRESS_FOR_DETAILS).contains('Technical Preview');
        });

        fillAboutRuleMinimumAndContinue(mlRule);
        skipScheduleRuleAction();
        createRuleWithoutEnabling();

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', suppressByFields.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '45m');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Do not suppress alerts for events with missing fields'
          );
        });
      });
    });
  }
);
