/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataTestSubjectSelector } from '../helpers/common';

export const HOST_TABLE_ROW_TOTAL_ALERTS =
  '[data-test-subj="hostSeverityAlertsTable-totalAlerts"] button';

export const HOST_TABLE_ROW_TOTAL_ALERTS_CELL_ACTION_BUTTON =
  '[data-test-subj="cellActions-renderContent-host.name"] button';

export const HOST_TABLE_HOST_NAME_BTN = getDataTestSubjectSelector('host-details-button');

export const HOST_TABLE_ROW_SEV = (sev: string) => `
${getDataTestSubjectSelector(
  `hostSeverityAlertsTable-${sev.toLowerCase()}`
)} ${getDataTestSubjectSelector(`cellActions-renderContent-host.name`)} 
`;

export const USER_TABLE_ROW_TOTAL_ALERTS =
  '[data-test-subj="userSeverityAlertsTable-totalAlerts"] button';

export const USER_TABLE_ROW_TOTAL_ALERTS_CELL_ACTION_BUTTON =
  '[data-test-subj="cellActions-renderContent-user.name"] button';

export const USER_TABLE_USER_NAME_BTN = getDataTestSubjectSelector('users-link-anchor');

export const USER_TABLE_ROW_SEV = (sev: string) => `
${getDataTestSubjectSelector(
  `userSeverityAlertsTable-${sev.toLowerCase()}`
)} ${getDataTestSubjectSelector(`cellActions-renderContent-user.name`)} 
`;

export const RULE_TABLE_ROW_TOTAL_ALERTS =
  '[data-test-subj="severityRuleAlertsTable-alertCount"] button';

export const RULE_TABLE_ROW_TOTAL_ALERTS_CELL_ACTION_BUTTON =
  '[data-test-subj="cellActions-renderContent-kibana.alert.rule.name"] button';

export const RULE_TABLE_VIEW_ALL_OPEN_ALERTS_BTN = getDataTestSubjectSelector(
  'severityRuleAlertsButton'
);

export const RULE_TABLE_ROW_RULE_NAME_BTN = getDataTestSubjectSelector(
  'severityRuleAlertsTable-name'
);

export const ALERTS_DONUT_CHART =
  '[data-test-subj="detection-response-alerts-by-status-panel"] [data-test-subj="donut-chart"]';
