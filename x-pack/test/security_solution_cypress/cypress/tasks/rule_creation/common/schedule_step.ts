/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleIntervalFrom } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine/model';
// For some reason importing these functions from ../../public/detections/pages/detection_engine/rules/helpers
// causes a "Webpack Compilation Error" in this file specifically, even though it imports fine in the test files
// in ../e2e/*, so we have a copy of the implementations in the cypress helpers.
import { getHumanizedDuration } from '../../../helpers/rules';

import {
  LOOK_BACK_INTERVAL,
  LOOK_BACK_TIME_TYPE,
  RUNS_EVERY_INTERVAL,
  RUNS_EVERY_TIME_TYPE,
  SCHEDULE_CONTINUE_BUTTON,
  SCHEDULE_EDIT_TAB,
} from '../../../screens/create_new_rule';
import { ruleFields } from '../../../data/detection_engine';

export const getHumanReadableLookback = (from: string, interval: string) => {
  const additionalLookback = getHumanizedDuration(from, interval ?? '5m');
  const additionalLookbackNumber = additionalLookback.slice(0, additionalLookback.length - 1);
  const additionalLookbackType = additionalLookback.charAt(additionalLookback.length - 1);

  return [additionalLookbackNumber, additionalLookbackType];
};
export const goToScheduleStepTab = () => {
  cy.get(SCHEDULE_EDIT_TAB).click({ force: true });
};

export const fillScheduleRule = (rule: RuleCreateProps) => {
  if (rule.interval) {
    const intervalNumber = rule.interval.slice(0, rule.interval.length - 1);
    const intervalType = rule.interval.charAt(rule.interval.length - 1);
    cy.get(RUNS_EVERY_INTERVAL).type('{selectall}');
    cy.get(RUNS_EVERY_INTERVAL).type(intervalNumber);

    cy.get(RUNS_EVERY_TIME_TYPE).select(intervalType);
  }
  if (rule.from) {
    const lookback = getHumanReadableLookback(rule.from, rule.interval ?? '5m');
    const additionalLookbackNumber = lookback[0];
    const additionalLookbackType = lookback[1];
    cy.get(LOOK_BACK_INTERVAL).type('{selectAll}');
    cy.get(LOOK_BACK_INTERVAL).type(additionalLookbackNumber);

    cy.get(LOOK_BACK_TIME_TYPE).select(additionalLookbackType);
  }
};

export const fillScheduleRuleAndContinue = (rule: RuleCreateProps) => {
  fillScheduleRule(rule);
  cy.get(SCHEDULE_CONTINUE_BUTTON).click({ force: true });
};

export const fillFrom = (from: RuleIntervalFrom = ruleFields.ruleIntervalFrom) => {
  const value = from.slice(0, from.length - 1);
  const type = from.slice(from.length - 1);
  cy.get(LOOK_BACK_INTERVAL).type('{selectAll}');
  cy.get(LOOK_BACK_INTERVAL).type(value);

  cy.get(LOOK_BACK_TIME_TYPE).select(type);
};
