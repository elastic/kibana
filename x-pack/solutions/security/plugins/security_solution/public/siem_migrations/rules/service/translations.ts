/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const POLLING_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rulesService.pollingError',
  { defaultMessage: 'Error fetching rule migrations' }
);

export const EMPTY_RULES_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rulesService.create.emptyRulesError',
  { defaultMessage: 'Can not create a migration without rules' }
);
