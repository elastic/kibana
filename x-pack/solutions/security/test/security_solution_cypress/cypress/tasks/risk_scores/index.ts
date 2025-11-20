/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HOSTS_TABLE_ALERT_CELL, USERS_TABLE_ALERT_CELL } from '../../screens/entity_analytics';

export const clickOnFirstUsersAlerts = () => {
  cy.get(USERS_TABLE_ALERT_CELL).first().click();
};

export const clickOnFirstHostsAlerts = () => {
  cy.get(HOSTS_TABLE_ALERT_CELL).first().click();
};
