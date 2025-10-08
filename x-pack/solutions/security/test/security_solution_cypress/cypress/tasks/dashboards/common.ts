/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_INVESTIGATE_IN_TIMELINE_CELL_ACTION } from '../../screens/dashboards/common';
import { EUI_ICON_IS_LOADING, EUI_BASIC_TABLE_LOADING } from '../../screens/common/controls';

export const investigateDashboardItemInTimeline = (selector: string, itemIndex: number = 0) => {
  // wait for any outstanding queries to complete
  cy.get(`${EUI_BASIC_TABLE_LOADING}`).should('not.exist');
  cy.get(selector).eq(itemIndex).realHover();
  cy.get(`${DASHBOARD_INVESTIGATE_IN_TIMELINE_CELL_ACTION} ${EUI_ICON_IS_LOADING}`).should(
    'not.exist'
  );
  cy.get(DASHBOARD_INVESTIGATE_IN_TIMELINE_CELL_ACTION).click();
};
