/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DASHBOARDS_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Dashboards"]';

export const ALERTS_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Alerts"]';

export const FINDINGS_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Findings"]';

export const TIMELINES_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Timelines"]';

export const CASES_PAGE = '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Cases"]';

export const EXPLORE_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Explore"]';

export const THREAT_INTELLIGENCE_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Intelligence"]';

export const MANAGE_PAGE =
  '[data-test-subj="collapsibleNavGroup-securitySolution"] [title="Manage"]';

export const KIBANA_NAVIGATION_TOGGLE = '[data-test-subj="toggleNavButton"]';

export const OBSERVABILITY_ALERTS_PAGE =
  '[data-test-subj="collapsibleNavGroup-observability"] [title="Alerts"]';

export const SPACES_BUTTON = '[data-test-subj="spacesNavSelector"]';

export const APP_LEAVE_CONFIRM_MODAL = '[data-test-subj="appLeaveConfirmModal"]';

export const getGoToSpaceMenuItem = (space: string) => `[data-test-subj="space-avatar-${space}"]`;

export const STACK_MANAGEMENT_PAGE =
  '[data-test-subj="collapsibleNavAppLink"] [title="Stack Management"]';
