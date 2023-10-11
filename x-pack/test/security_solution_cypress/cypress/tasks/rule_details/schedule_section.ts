/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EqlRuleCreateProps,
  NewTermsRuleCreateProps,
  QueryRuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  ADDITIONAL_LOOK_BACK_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
} from '../../screens/rule_details';
import { getDetails } from '.';
import { ruleFields } from '../../data/detection_engine';
import { getHumanizedDuration } from '../../helpers/rules';

export const confirmRuleDetailsSchedule = (
  rule: RuleResponse | QueryRuleCreateProps | EqlRuleCreateProps | NewTermsRuleCreateProps
) => {
  const lookbackTime = getHumanizedDuration(
    rule.from ?? ruleFields.ruleIntervalFrom,
    rule.interval ?? ruleFields.ruleInterval
  );

  cy.get(SCHEDULE_DETAILS).within(() => {
    getDetails(RUNS_EVERY_DETAILS).should('have.text', rule.interval);
    getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', lookbackTime);
  });
};
