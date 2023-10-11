/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleFields } from '../../data/detection_engine';
import { EQL_QUERY_INPUT, RULES_CREATION_FORM } from '../../screens/rule_creation';
import { fillEqlQuery } from '../rule_creation';

export const editEQLRuleQuery = (query: string = ruleFields.ruleQuery, clear: boolean = true) => {
  if (clear) {
    cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).clear();
  }
  fillEqlQuery(query);
};
