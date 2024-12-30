/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FILE_UPLOAD_ERROR = {
  CAN_NOT_READ: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.canNotRead',
    { defaultMessage: 'Failed to read file' }
  ),
  CAN_NOT_READ_WITH_REASON: (reason: string) =>
    i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.canNotReadWithReason',
      {
        defaultMessage: 'An error occurred when reading file: {reason}',
        values: { reason },
      }
    ),
  CAN_NOT_PARSE: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.canNotParse',
    { defaultMessage: 'Cannot parse the file as either a JSON file or NDJSON file' }
  ),
  TOO_LARGE_TO_PARSE: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.tooLargeToParse',
    { defaultMessage: 'This file is too large to parse' }
  ),
  NOT_ARRAY: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.notArray',
    { defaultMessage: 'The file content is not an array' }
  ),
  EMPTY: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.empty',
    { defaultMessage: 'The file is empty' }
  ),
  NOT_OBJECT: i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.notObject',
    { defaultMessage: 'The file contains non-object entries' }
  ),
  WRONG_FORMAT: (formatError: string) => {
    return i18n.translate(
      'xpack.securitySolution.siemMigrations.rules.dataInputFlyout.fileUploadError.wrongFormat',
      {
        defaultMessage: 'The file has wrong format: {formatError}',
        values: { formatError },
      }
    );
  },
};
