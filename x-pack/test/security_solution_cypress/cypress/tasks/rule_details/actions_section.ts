/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_DETAILS,
  ACTION_DETAILS_CONNECTOR_FREQUENCY,
  ACTION_DETAILS_CONNECTOR_NAME,
} from '../../screens/rule_details';
import { getDetails } from './common_tasks';

export const confirmRuleDetailsActions = (name: string, frequency: string) => {
  cy.get(ACTION_DETAILS).within(() => {
    cy.get(ACTION_DETAILS_CONNECTOR_NAME).should('have.text', name);
    getDetails(ACTION_DETAILS_CONNECTOR_FREQUENCY).should('have.text', frequency);
  });
};
