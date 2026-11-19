/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RowValidationError } from './types';
import {
  SUPPORTED_FILE_TYPES,
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  VALID_ENTITY_TYPES,
  REQUIRED_COLUMNS,
} from './constants';

export const validateFile = (
  file: File,
  formatBytes: (bytes: number) => string
): { valid: false; errorMessage: string } | { valid: true } => {
  if (file.type !== '' && !SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityResolutionUpload.unsupportedFileType',
        {
          defaultMessage: 'Invalid file format. Please choose a {formats} file and try again',
          values: { formats: SUPPORTED_FILE_EXTENSIONS.join(', ') },
        }
      ),
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityResolutionUpload.emptyFile',
        { defaultMessage: 'The selected file is empty.' }
      ),
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityResolutionUpload.fileTooLarge',
        {
          defaultMessage: 'File size {fileSize} exceeds maximum file size of {maxFileSize}',
          values: {
            fileSize: formatBytes(file.size),
            maxFileSize: formatBytes(MAX_FILE_SIZE_BYTES),
          },
        }
      ),
    };
  }

  return { valid: true };
};

export const validateHeaders = (
  headers: string[]
): { valid: true } | { valid: false; errorMessage: string } => {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  const missingRequired = REQUIRED_COLUMNS.filter((col) => !normalizedHeaders.includes(col));

  if (missingRequired.length > 0) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityResolutionUpload.missingHeaders',
        {
          defaultMessage: 'CSV is missing required columns: {columns}',
          values: { columns: missingRequired.join(', ') },
        }
      ),
    };
  }

  const identityColumns = normalizedHeaders.filter((h) => !REQUIRED_COLUMNS.includes(h));
  if (identityColumns.length === 0) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.entityResolutionUpload.noIdentityColumns',
        {
          defaultMessage:
            'CSV must have at least one identity column besides "type" and "resolved_to" (e.g., user.email, host.name)',
        }
      ),
    };
  }

  return { valid: true };
};

export const validateParsedRows = (
  rows: Array<Record<string, string>>
): {
  valid: Array<Record<string, string>>;
  invalid: Array<Record<string, string>>;
  errors: RowValidationError[];
} => {
  const valid: Array<Record<string, string>> = [];
  const invalid: Array<Record<string, string>> = [];
  const errors: RowValidationError[] = [];

  rows.forEach((row, i) => {
    const error = validateRow(row);
    if (error) {
      invalid.push(row);
      errors.push({ message: error, index: i + 2 }); // +2: 1-based + skip header row
    } else {
      valid.push(row);
    }
  });

  return { valid, invalid, errors };
};

const validateRow = (row: Record<string, string>): string | null => {
  const type = row.type;
  const resolvedTo = row.resolved_to;

  if (!type || !VALID_ENTITY_TYPES.includes(type)) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityResolutionUpload.invalidType',
      {
        defaultMessage: 'Invalid entity type "{type}". Must be one of: {validTypes}',
        values: { type: type ?? '', validTypes: VALID_ENTITY_TYPES.join(', ') },
      }
    );
  }

  if (!resolvedTo) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityResolutionUpload.missingResolvedTo',
      { defaultMessage: 'Missing resolved_to value' }
    );
  }

  const identityValues = Object.entries(row)
    .filter(([key]) => !REQUIRED_COLUMNS.includes(key))
    .filter(([, value]) => value && value.trim() !== '');

  if (identityValues.length === 0) {
    return i18n.translate(
      'xpack.securitySolution.entityAnalytics.entityResolutionUpload.noIdentityFields',
      { defaultMessage: 'No identifying fields provided' }
    );
  }

  return null;
};
