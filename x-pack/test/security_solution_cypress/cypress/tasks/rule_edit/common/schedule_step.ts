/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SCHEDULE_EDIT_TAB,
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
} from '../../../screens/rule_creation';
import { ruleFields } from '../../../data/detection_engine';
import { fillScheduleRule } from '../../rule_creation';

export const goToScheduleStepTab = () => {
  cy.get(SCHEDULE_EDIT_TAB).click({ force: true });
};

export const editScheduleRule = (interval: string | undefined, from: string | undefined) => {
  fillScheduleRule(interval, from);
};

export const confirmEditStepSchedule = (interval: string = ruleFields.ruleInterval) => {
  const intervalParts = interval != null && interval.match(/[0-9]+|[a-zA-Z]+/g);
  if (intervalParts) {
    const [amount, unit] = intervalParts;
    cy.get(SCHEDULE_INTERVAL_AMOUNT_INPUT).invoke('val').should('eql', amount);
    cy.get(SCHEDULE_INTERVAL_UNITS_INPUT).invoke('val').should('eql', unit);
  } else {
    throw new Error('Cannot assert scheduling info on a rule without an interval');
  }
};
