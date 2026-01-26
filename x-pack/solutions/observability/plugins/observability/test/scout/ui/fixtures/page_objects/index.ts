/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltPageObjects, ScoutPage } from '@kbn/scout-oblt';
import { createLazyPageObject } from '@kbn/scout-oblt';
import { RulesPage } from './rules_page';
import { RuleDetailsPage } from './rule_details_page';
import { AlertPage } from './alert_page';

export interface TriggersActionsPageObjects extends ObltPageObjects {
  rulesPage: RulesPage;
  ruleDetailsPage: RuleDetailsPage;
  alertPage: AlertPage;
}

export function extendPageObjects(
  pageObjects: ObltPageObjects,
  page: ScoutPage
): TriggersActionsPageObjects {
  return {
    ...pageObjects,
    rulesPage: createLazyPageObject(RulesPage, page),
    ruleDetailsPage: createLazyPageObject(RuleDetailsPage, page),
    alertPage: createLazyPageObject(AlertPage, page),
  };
}
