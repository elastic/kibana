/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMachineLearningRule } from '../../../../objects/rule';
import {
  ALERT_SUPPRESSION_DURATION_UNIT_INPUT,
  ALERT_SUPPRESSION_DURATION_VALUE_INPUT,
  ALERT_SUPPRESSION_FIELDS,
  ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS,
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
import { editFirstRule } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { createRule } from '../../../../tasks/api_calls/rules';
import {
  clearAlertSuppressionFields,
  fillAlertSuppressionFields,
  selectAlertSuppressionPerInterval,
  selectAlertSuppressionPerRuleExecution,
  setAlertSuppressionDuration,
} from '../../../../tasks/create_new_rule';
import { saveEditedRule } from '../../../../tasks/edit_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { assertDetailsNotExist, getDetails } from '../../../../tasks/rule_details';
import { RULES_MANAGEMENT_URL } from '../../../../urls/rules_management';

describe(
  'Machine Learning Detection Rules - Editing',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
  },
  () => {
    let mlRule: ReturnType<typeof getMachineLearningRule>;
    const suppressByFields = ['by_field_name', 'by_field_value'];
    const jobId = 'v3_linux_anomalous_network_activity';

    before(() => {
      const machineLearningJobIds = ([] as string[]).concat(
        getMachineLearningRule().machine_learning_job_id
      );
      // ensure no ML jobs are started before the test
      machineLearningJobIds.forEach((j) => forceStopAndCloseJob({ jobId: j }));
    });

    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      cy.task('esArchiverLoad', { archiveName: '../auditbeat/hosts', type: 'ftr' });
      setupMlModulesWithRetry({ moduleName: 'security_linux_v3' });
      forceStartDatafeeds({ jobIds: [jobId] });
      cy.task('esArchiverLoad', { archiveName: 'anomalies', type: 'ftr' });
    });

    describe('without Alert Suppression', () => {
      beforeEach(() => {
        mlRule = getMachineLearningRule({ machine_learning_job_id: [jobId] });
        createRule(mlRule);
        visit(RULES_MANAGEMENT_URL);
        editFirstRule();
      });

      it('allows editing of a rule to add suppression configuration', () => {
        fillAlertSuppressionFields(suppressByFields);
        selectAlertSuppressionPerInterval();
        setAlertSuppressionDuration(2, 'h');

        saveEditedRule();

        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_BY_DETAILS).should('have.text', suppressByFields.join(''));
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '2h');
          getDetails(SUPPRESS_MISSING_FIELD).should(
            'have.text',
            'Suppress and group alerts for events with missing fields'
          );
        });
      });
    });

    describe('with Alert Suppression', () => {
      beforeEach(() => {
        mlRule = {
          ...getMachineLearningRule({ machine_learning_job_id: [jobId] }),
          alert_suppression: {
            group_by: suppressByFields,
            duration: { value: 360, unit: 's' },
            missing_fields_strategy: 'doNotSuppress',
          },
        };

        createRule(mlRule);
        visit(RULES_MANAGEMENT_URL);
        editFirstRule();
      });

      it('allows editing of a rule to change its suppression configuration', () => {
        // check saved suppression settings
        cy.get(ALERT_SUPPRESSION_DURATION_VALUE_INPUT)
          .should('be.enabled')
          .should('have.value', 360);
        cy.get(ALERT_SUPPRESSION_DURATION_UNIT_INPUT)
          .should('be.enabled')
          .should('have.value', 's');

        cy.get(ALERT_SUPPRESSION_FIELDS).should('contain', suppressByFields.join(''));
        cy.get(ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS).should('be.checked');

        // set new duration first to overcome some flaky racing conditions during form save
        setAlertSuppressionDuration(2, 'h');
        selectAlertSuppressionPerRuleExecution();

        saveEditedRule();

        // check execution duration has changed
        cy.get(DEFINITION_DETAILS).within(() => {
          getDetails(SUPPRESS_FOR_DETAILS).should('have.text', 'One rule execution');
        });
      });

      it('allows editing of a rule to remove suppression configuration', () => {
        // check saved suppression settings
        cy.get(ALERT_SUPPRESSION_DURATION_VALUE_INPUT)
          .should('be.enabled')
          .should('have.value', 360);
        cy.get(ALERT_SUPPRESSION_DURATION_UNIT_INPUT)
          .should('be.enabled')
          .should('have.value', 's');

        cy.get(ALERT_SUPPRESSION_FIELDS).should('contain', suppressByFields.join(''));
        cy.get(ALERT_SUPPRESSION_MISSING_FIELDS_DO_NOT_SUPPRESS).should('be.checked');

        // set new duration first to overcome some flaky racing conditions during form save
        setAlertSuppressionDuration(2, 'h');

        clearAlertSuppressionFields();
        saveEditedRule();

        // check suppression is now absent
        cy.get(DEFINITION_DETAILS).within(() => {
          assertDetailsNotExist(SUPPRESS_FOR_DETAILS);
          assertDetailsNotExist(SUPPRESS_BY_DETAILS);
        });
      });
    });
  }
);
