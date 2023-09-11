/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ROLES } from '@kbn/security-solution-plugin/common/test';
import { RULES_MANAGEMENT_URL } from '../urls/rules_management';
import { resetRulesTableState } from './common';
import { visit } from './login';

export const visitRulesManagementTable = (role?: ROLES) => {
  resetRulesTableState(); // Clear persistent rules filter data before page loading
  visit(RULES_MANAGEMENT_URL, role);
};
