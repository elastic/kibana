/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOOKUPS_DATA_INPUT_FILE_UPLOAD_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.lookupsFileUpload.title',
  { defaultMessage: 'Update your lookups export' }
);
export const LOOKUPS_DATA_INPUT_FILE_UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.lookupsFileUpload.prompt',
  { defaultMessage: 'Select or drag and drop the exported lookup files' }
);
export const LOOKUPS_DATA_INPUT_FILE_UPLOAD_NOT_UPLOADED_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.lookupsFileUpload.notUploadedTitle',
  { defaultMessage: 'Lookups not uploaded' }
);
export const LOOKUPS_DATA_INPUT_FILE_UPLOAD_NOT_UPLOADED = (lookupsNames: string) =>
  i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.lookupsFileUpload.notUploaded',
    {
      defaultMessage: 'The following files did not match any missing lookup: {lookupsNames}',
      values: { lookupsNames },
    }
  );

export const LOOKUPS_DATA_INPUT_FILE_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.lookups.lookupsFileUpload.button',
  { defaultMessage: 'Upload' }
);
