/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage, SecurityPageObjects } from '@kbn/scout-security';
import { createLazyPageObject } from '@kbn/scout-security';
import { ResponseActionsHistoryPage } from './response_actions_history_page';
import { RuleResponseActionsFormPage } from './rule_response_actions_form';

export interface ResponseActionsPageObjects extends SecurityPageObjects {
  responseActionsHistory: ResponseActionsHistoryPage;
  ruleResponseActionsForm: RuleResponseActionsFormPage;
}

export const extendPageObjects = (
  pageObjects: SecurityPageObjects,
  page: ScoutPage
): ResponseActionsPageObjects => ({
  ...pageObjects,
  responseActionsHistory: createLazyPageObject(ResponseActionsHistoryPage, page),
  ruleResponseActionsForm: createLazyPageObject(RuleResponseActionsFormPage, page),
});
