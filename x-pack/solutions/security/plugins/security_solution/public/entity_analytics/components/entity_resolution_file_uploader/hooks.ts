/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { parse, unparse } from 'papaparse';
import { useCallback, useMemo } from 'react';
import type { EuiStepHorizontalProps } from '@elastic/eui/src/components/steps/step_horizontal';
import { noop } from 'lodash/fp';
import { useFormatBytes } from '../../../common/components/formatted_bytes';
import { validateFile, validateHeaders, validateParsedRows } from './validations';
import type { OnCompleteParams } from './types';
import type { ReducerState } from './reducer';
import { getStepStatus, isValidationStep } from './helpers';

interface UseFileValidationParams {
  onError: (errorMessage: string) => void;
  onComplete: (params: OnCompleteParams) => void;
}

export const useFileValidation = ({ onError, onComplete }: UseFileValidationParams) => {
  const formatBytes = useFormatBytes();

  return useCallback(
    (file: File) => {
      const fileValidation = validateFile(file, formatBytes);
      if (!fileValidation.valid) {
        onError(fileValidation.errorMessage);
        return;
      }

      parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase(),
        transform: (v: string) => v.trim(),
        complete(parsedFile) {
          const headers = parsedFile.meta.fields ?? [];
          const headerValidation = validateHeaders(headers);
          if (!headerValidation.valid) {
            onError(headerValidation.errorMessage);
            return;
          }

          const rows = parsedFile.data as Array<Record<string, string>>;
          if (rows.length === 0) {
            onError(
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.entityResolutionUpload.emptyFileError',
                { defaultMessage: 'The file contains no data rows' }
              )
            );
            return;
          }

          const { valid, invalid, errors } = validateParsedRows(rows);

          const validLinesText = rowsToText(headers, valid);
          const invalidLinesText = rowsToText(headers, invalid);

          onComplete({
            validatedFile: {
              name: file.name,
              size: file.size,
              validLines: { text: validLinesText, count: valid.length },
              invalidLines: { text: invalidLinesText, count: invalid.length, errors },
            },
          });
        },
        error(parserError) {
          onError(parserError.message);
        },
      });
    },
    [formatBytes, onError, onComplete]
  );
};

const rowsToText = (headers: string[], rows: Array<Record<string, string>>): string => {
  if (rows.length === 0) {
    return '';
  }
  return unparse({ fields: headers, data: rows.map((row) => headers.map((h) => row[h] ?? '')) });
};

export const useNavigationSteps = (
  state: ReducerState,
  goToFirstStep: () => void
): Array<Omit<EuiStepHorizontalProps, 'step'>> => {
  return useMemo(
    () => [
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityResolutionUpload.selectFileStep',
          { defaultMessage: 'Select a file' }
        ),
        status: getStepStatus(1, state.step),
        onClick: () => {
          if (isValidationStep(state)) {
            goToFirstStep();
          }
        },
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityResolutionUpload.validationStep',
          { defaultMessage: 'File validation' }
        ),
        status: getStepStatus(2, state.step),
        onClick: noop,
      },
      {
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.entityResolutionUpload.resultsStep',
          { defaultMessage: 'Results' }
        ),
        status: getStepStatus(3, state.step),
        onClick: noop,
      },
    ],
    [goToFirstStep, state]
  );
};
