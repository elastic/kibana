/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_INPUTS_BUTTON } from '../../screens/flyout_risk_panel';

/**
 * Expand the expandable flyout left section with risk inputs details */
export const expandRiskInputsFlyoutPanel = () => {
  cy.get(RISK_INPUTS_BUTTON).click();
};
