/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, SecurityPageObjects } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { CaseViewPage } from './case_view_page';
import { ResponseActionsHistoryPage } from './response_actions_history_page';
import { ResponseConsolePage } from './response_console_page';
import { RuleResponseActionsFormPage } from './rule_response_actions_form';

export interface ResponseActionsPageObjects extends SecurityPageObjects {
  caseView: CaseViewPage;
  responseActionsHistory: ResponseActionsHistoryPage;
  responseConsole: ResponseConsolePage;
  ruleResponseActionsForm: RuleResponseActionsFormPage;
}

export const extendPageObjects = (
  pageObjects: SecurityPageObjects,
  page: ScoutPage
): ResponseActionsPageObjects => ({
  ...pageObjects,
  caseView: createLazyPageObject(CaseViewPage, page),
  responseActionsHistory: createLazyPageObject(ResponseActionsHistoryPage, page),
  responseConsole: createLazyPageObject(ResponseConsolePage, page),
  ruleResponseActionsForm: createLazyPageObject(RuleResponseActionsFormPage, page),
});
