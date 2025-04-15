/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOOKUPS_DATA_INPUT_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.title',
  { defaultMessage: 'Upload lookups' }
);
export const LOOKUPS_DATA_INPUT_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.description',
  {
    defaultMessage: `We've also found lookups within your rules. To fully translate those rules containing these lookups, follow the step-by-step guide to export and upload them all.`,
  }
);
