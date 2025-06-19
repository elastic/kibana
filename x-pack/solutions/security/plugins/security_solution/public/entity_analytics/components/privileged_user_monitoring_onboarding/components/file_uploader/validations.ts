/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { isRight } from 'fp-ts/Either';
import { parseMonitoredPrivilegedUserCsvRow } from '../../../../../../common/entity_analytics/privileged_user_monitoring/parse_privileged_user_monitoring_csv_row';
import {
  PRIVMON_USERS_CSV_MAX_SIZE_BYTES,
  PRIVMON_USERS_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE,
} from '../../../../../../common/entity_analytics/privileged_user_monitoring/constants';
import { SUPPORTED_FILE_EXTENSIONS, SUPPORTED_FILE_TYPES } from './constants';

export interface RowValidationErrors {
  message: string;
  index: number;
}

export const validateParsedContent = (
  data: string[][]
): { valid: string[][]; invalid: string[][]; errors: RowValidationErrors[] } => {
  if (data.length === 0) {
    return { valid: [], invalid: [], errors: [] };
  }

  let errorIndex = 1; // Error index starts from 1 because EuiCodeBlock line numbers start from 1
  const { valid, invalid, errors } = data.reduce<{
    valid: string[][];
    invalid: string[][];
    errors: RowValidationErrors[];
  }>(
    (acc, row) => {
      const parsedRow = parseMonitoredPrivilegedUserCsvRow(row);

      // parsed row is a fp-ts/Either
      // please add and if to check if the parsedRow is valid
      // and consider that Property 'valid' does not exist on type 'Either<string, string>'.
      // Property 'valid' does not exist on type 'Left<string>'.

      if (isRight(parsedRow)) {
        acc.valid.push(row);
      } else {
        acc.invalid.push(row);
        acc.errors.push({ message: parsedRow.left, index: errorIndex });
        errorIndex++;
      }

      return acc;
    },
    { valid: [], invalid: [], errors: [] }
  );

  return { valid, invalid, errors };
};

export const validateFile = (
  file: File,
  formatBytes: (bytes: number) => string
): { valid: false; errorMessage: string; code: string } | { valid: true } => {
  if (
    file.type !== '' && // file.type might be an empty string on windows
    !SUPPORTED_FILE_TYPES.includes(file.type)
  ) {
    return {
      valid: false,
      code: 'unsupported_file_type',
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validations.unsupportedFileTypeError',
        {
          defaultMessage: `Invalid file format selected. Please choose a {supportedFileExtensions} file and try again`,
          values: { supportedFileExtensions: SUPPORTED_FILE_EXTENSIONS.join(', ') },
        }
      ),
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      code: 'empty_file',
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validations.emptyFileErrorMessage',
        {
          defaultMessage: `The selected file is empty.`,
        }
      ),
    };
  }

  if (file.size > PRIVMON_USERS_CSV_MAX_SIZE_BYTES_WITH_TOLERANCE) {
    return {
      valid: false,
      code: 'file_size_exceeds_limit',
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.validations.fileSizeExceedsLimitErrorMessage',
        {
          defaultMessage: 'File size {fileSize} exceeds maximum file size of {maxFileSize}',
          values: {
            fileSize: formatBytes(file.size),
            maxFileSize: formatBytes(PRIVMON_USERS_CSV_MAX_SIZE_BYTES),
          },
        }
      ),
    };
  }
  return { valid: true };
};
