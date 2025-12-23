/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObltPageObjects, ScoutPage } from '@kbn/scout-oblt';
import { createLazyPageObject } from '@kbn/scout-oblt';
import { RulesPage } from './rules_page';
import { CustomThresholdRulePage } from './custom_threshold_rule_page';

export interface TriggersActionsPageObjects extends ObltPageObjects {
  rulesPage: RulesPage;
  customThresholdRulePage: CustomThresholdRulePage;
}

export function extendPageObjects(
  pageObjects: ObltPageObjects,
  page: ScoutPage
): TriggersActionsPageObjects {
  return {
    ...pageObjects,
    rulesPage: createLazyPageObject(RulesPage, page),
    customThresholdRulePage: createLazyPageObject(CustomThresholdRulePage, page),
  };
}
