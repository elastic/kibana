/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SUPPORTED_FILE_TYPES, SUPPORTED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from './constants';

export const validateFile = (
  file: File,
  formatBytes: (bytes: number) => string
): { valid: true } | { valid: false; errorMessage: string } => {
  if (file.type !== '' && !SUPPORTED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.unsupportedFileType',
        {
          defaultMessage: 'Invalid file format. Please choose a {formats} file and try again.',
          values: { formats: SUPPORTED_FILE_EXTENSIONS.join(', ') },
        }
      ),
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.emptyFile',
        { defaultMessage: 'The selected file is empty.' }
      ),
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      errorMessage: i18n.translate(
        'xpack.securitySolution.entityAnalytics.watchlists.flyout.csv.fileTooLarge',
        {
          defaultMessage: 'File size {fileSize} exceeds the maximum file size of {maxFileSize}.',
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
