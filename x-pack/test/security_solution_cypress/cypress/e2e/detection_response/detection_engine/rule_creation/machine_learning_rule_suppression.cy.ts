/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMachineLearningRule } from '../../../../objects/rule';
import { TOOLTIP } from '../../../../screens/common';
import {
  ALERT_SUPPRESSION_FIELDS_INPUT,
  ALERT_SUPPRESSION_WARNING,
} from '../../../../screens/create_new_rule';
import {
  DEFINITION_DETAILS,
  SUPPRESS_BY_DETAILS,
  SUPPRESS_FOR_DETAILS,
  SUPPRESS_MISSING_FIELD,
} from '../../../../screens/rule_details';
import {
  forceStartDatafeeds,
  forceStopAndCloseJob,
  setupMlModulesWithRetry,
} from '../../../../support/machine_learning';
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
  },
  () => {
    let mlRule: ReturnType<typeof getMachineLearningRule>;
    const jobId = 'v3_linux_anomalous_network_activity';
    const suppressByFields = ['by_field_name', 'by_field_value'];

    beforeEach(() => {
      login();
      visit(CREATE_RULE_URL);
    });

    describe('with Alert Suppression', () => {
      describe('when no ML jobs have run', () => {
        before(() => {
          const machineLearningJobIds = ([] as string[]).concat(
            getMachineLearningRule().machine_learning_job_id
          );
          // ensure no ML jobs are started before the suite
          machineLearningJobIds.forEach((j) => forceStopAndCloseJob({ jobId: j }));
        });

        beforeEach(() => {
          mlRule = getMachineLearningRule();
          selectMachineLearningRuleType();
          fillDefineMachineLearningRule(mlRule);
        });

        it('disables the suppression fields and displays a message', () => {
          cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).should('be.disabled');
          cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).realHover();
          cy.get(TOOLTIP).should(
            'contain.text',
            'To enable alert suppression, start relevant Machine Learning jobs.'
          );
        });
      });

      describe('when ML jobs have run', () => {
        before(() => {
          cy.task('esArchiverLoad', { archiveName: '../auditbeat/hosts', type: 'ftr' });
          setupMlModulesWithRetry({ moduleName: 'security_linux_v3' });
          forceStartDatafeeds({ jobIds: [jobId] });
          cy.task('esArchiverLoad', { archiveName: 'anomalies', type: 'ftr' });
        });

        after(() => {
          cy.task('esArchiverUnload', { archiveName: 'anomalies', type: 'ftr' });
          cy.task('esArchiverUnload', { archiveName: '../auditbeat/hosts', type: 'ftr' });
        });

        describe('when not all jobs are running', () => {
          beforeEach(() => {
            mlRule = getMachineLearningRule();
            selectMachineLearningRuleType();
            fillDefineMachineLearningRule(mlRule);
          });

          it('displays a warning message on the suppression fields', () => {
            cy.get(ALERT_SUPPRESSION_FIELDS_INPUT).should('be.enabled');
            cy.get(ALERT_SUPPRESSION_WARNING).should(
              'contain.text',
              'This list of fields might be incomplete as some Machine Learning jobs are not running. Start all relevant jobs for a complete list.'
            );
          });
        });

        describe('when all jobs are running', () => {
          beforeEach(() => {
            mlRule = getMachineLearningRule({ machine_learning_job_id: [jobId] });
            selectMachineLearningRuleType();
            fillDefineMachineLearningRule(mlRule);
          });

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
      });
    });
  }
);
