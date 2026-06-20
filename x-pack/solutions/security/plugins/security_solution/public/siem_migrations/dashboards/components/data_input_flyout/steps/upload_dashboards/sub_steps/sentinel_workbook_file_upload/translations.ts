/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SENTINEL_WORKBOOK_FILE_UPLOAD_PROMPT = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.sentinelWorkbookUpload.prompt',
  { defaultMessage: 'Drag and drop a Sentinel Workbook ARM template (.json) or click to upload' }
);

export const SENTINEL_WORKBOOK_FILE_UPLOAD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.dashboards.dataInputFlyout.sentinelWorkbookUpload.description',
  {
    defaultMessage:
      'Upload the Microsoft Sentinel ARM template JSON export containing your Workbook resources.',
  }
);
