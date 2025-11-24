/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MIGRATION_SOURCE_DROPDOWN_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.migrationSource.title',
  { defaultMessage: 'Select migration source' }
);

export const MIGRATION_SOURCE_DROPDOWN_OPTION_SPLUNK = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.migrationSource.option.splunk',
  { defaultMessage: 'Splunk' }
);

export const MIGRATION_SOURCE_DROPDOWN_OPTION_QRADAR = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.migrationSource.option.qradar',
  { defaultMessage: 'QRadar' }
);
