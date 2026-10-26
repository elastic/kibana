/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIEM_MIGRATIONS_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { RULES_API_READ } from '@kbn/security-solution-features/constants';

export const authz = {
  requiredPrivileges: [RULES_API_READ, SIEM_MIGRATIONS_API_ACTION_ALL],
};
