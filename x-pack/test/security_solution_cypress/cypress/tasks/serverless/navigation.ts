/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS } from '../../screens/serverless_security_header';

const navigateTo = (page: string) => {
  cy.get(page).click();
};

export const navigateToAlertsPageInServerless = () => {
  navigateTo(ALERTS);
};
