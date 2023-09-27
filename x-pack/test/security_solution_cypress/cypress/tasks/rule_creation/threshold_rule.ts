/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray } from 'lodash';

import type { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine/model';
import {
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  INPUT,
  THRESHOLD_INPUT_AREA,
  THRESHOLD_TYPE,
} from '../../screens/create_new_rule';
import { EUI_FILTER_SELECT_ITEM } from '../../screens/common/controls';

export const selectThresholdRuleType = () => {
  cy.get(THRESHOLD_TYPE).click({ force: true });
};

export const fillDefineThresholdRuleAndContinue = (rule: ThresholdRuleCreateProps) => {
  const thresholdField = 0;
  const threshold = 1;

  cy.get(CUSTOM_QUERY_INPUT)
    .first()
    .type(rule.query || '');
  cy.get(THRESHOLD_INPUT_AREA)
    .find(INPUT)
    .then((inputs) => {
      cy.wrap(inputs[thresholdField]).click();
      cy.wrap(inputs[thresholdField]).type(
        isArray(rule.threshold.field) ? rule.threshold.field[0] : rule.threshold.field,
        {
          delay: 35,
        }
      );
      cy.get(EUI_FILTER_SELECT_ITEM).click({ force: true });
      cy.wrap(inputs[threshold]).clear();
      cy.wrap(inputs[threshold]).type(`${rule.threshold.value}`);
    });
  cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click({ force: true });
};
