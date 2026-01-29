/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULES_DATA_INPUT_CHECK_RESOURCES_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.checkResources.title',
  { defaultMessage: 'Check for macros and lookups' }
);

export const RULES_DATA_INPUT_CHECK_RESOURCES_SPLUNK_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.checkResources.description',
  {
    defaultMessage: `For best translation results, we will review the data for macros and lookups. If found, we will ask you to upload them next.`,
  }
);
