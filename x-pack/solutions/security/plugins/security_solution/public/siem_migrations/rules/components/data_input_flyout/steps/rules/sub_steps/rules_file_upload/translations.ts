/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULES_DATA_INPUT_FILE_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.title',
  { defaultMessage: 'Update your rules export' }
);
export const RULES_DATA_INPUT_FILE_UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.prompt',
  { defaultMessage: 'Select or drag and drop the exported JSON file' }
);

export const RULES_DATA_INPUT_CREATE_MIGRATION_SUCCESS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.createSuccess',
  { defaultMessage: 'Rules uploaded successfully' }
);
export const RULES_DATA_INPUT_CREATE_MIGRATION_ERROR = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.rules.rulesFileUpload.createError',
  { defaultMessage: 'Failed to upload rules file' }
);
