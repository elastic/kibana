/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OKTA_INTEGRATION_CARD } from '../../screens/entity_analytics/privileged_user_monitoring';

export const clickOktaCard = () => {
  cy.get(OKTA_INTEGRATION_CARD).click();
};
