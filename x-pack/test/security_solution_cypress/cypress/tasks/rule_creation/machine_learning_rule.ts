/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';

import { MachineLearningRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  ANOMALY_THRESHOLD_INPUT,
  MACHINE_LEARNING_DROPDOWN_INPUT,
  MACHINE_LEARNING_TYPE,
} from '../../screens/create_new_rule';
import { getDefineContinueButton } from './common/define_step';

export const selectMachineLearningRuleType = () => {
  cy.get(MACHINE_LEARNING_TYPE).contains('Select');
  cy.get(MACHINE_LEARNING_TYPE).click({ force: true });
};

export const fillDefineMachineLearningRuleAndContinue = (rule: MachineLearningRuleCreateProps) => {
  const jobsAsArray = isArray(rule.machine_learning_job_id)
    ? rule.machine_learning_job_id
    : [rule.machine_learning_job_id];
  const text = jobsAsArray
    .map((machineLearningJob) => `${machineLearningJob}{downArrow}{enter}`)
    .join('');
  cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).click({ force: true });
  cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).type(text);

  cy.get(MACHINE_LEARNING_DROPDOWN_INPUT).type('{esc}');

  cy.get(ANOMALY_THRESHOLD_INPUT).type(`{selectall}${rule.anomaly_threshold}`, {
    force: true,
  });
  getDefineContinueButton().should('exist').click({ force: true });
};
