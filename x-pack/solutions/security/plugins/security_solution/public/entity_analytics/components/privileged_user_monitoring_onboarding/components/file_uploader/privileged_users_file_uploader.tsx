/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiStepsHorizontal } from '@elastic/eui';
import React, { useCallback, useReducer } from 'react';

import { useKibana } from '../../../../../common/lib/kibana';
import { EntityEventTypes } from '../../../../../common/lib/telemetry';
import { useEntityAnalyticsRoutes } from '../../../../api/api';
import { INITIAL_STATE, reducer } from './reducer';
import { useFileValidation, useNavigationSteps } from './hooks';
import type { OnCompleteParams } from './types';
import { isErrorStep, isFilePickerStep, isValidationStep } from './helpers';
import { PrivilegedUserMonitoringFilePickerStep } from './components/file_picker_step';
import { PrivilegedUserMonitoringValidationStep } from './components/validation_step';
import { PrivilegedUserMonitoringErrorStep } from './components/error_step';

interface PrivilegedUsersFileUploaderProps {
  onFileUploaded: (userCount: number) => void;
  onClose: () => void;
}

export const PrivilegedUsersFileUploader: React.FC<PrivilegedUsersFileUploaderProps> = ({
  onFileUploaded,
  onClose,
}) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { uploadPrivilegedUserMonitoringFile } = useEntityAnalyticsRoutes();
  const { telemetry } = useKibana().services;

  const onValidationComplete = useCallback(
    ({ validatedFile, processingStartTime, processingEndTime, tookMs }: OnCompleteParams) => {
      telemetry.reportEvent(EntityEventTypes.PrivilegedUserMonitoringCsvPreviewGenerated, {
        file: {
          size: validatedFile.size,
        },
        processing: {
          startTime: processingStartTime,
          endTime: processingEndTime,
          tookMs,
        },
        stats: {
          validLines: validatedFile.validLines.count,
          invalidLines: validatedFile.invalidLines.count,
          totalLines: validatedFile.validLines.count + validatedFile.invalidLines.count,
        },
      });

      dispatch({
        type: 'fileValidated',
        payload: {
          validatedFile: {
            name: validatedFile.name,
            size: validatedFile.size,
            validLines: {
              text: validatedFile.validLines.text,
              count: validatedFile.validLines.count,
            },
            invalidLines: {
              text: validatedFile.invalidLines.text,
              count: validatedFile.invalidLines.count,
              errors: validatedFile.invalidLines.errors,
            },
          },
        },
      });
    },
    [telemetry]
  );
  const onValidationError = useCallback((message: string) => {
    dispatch({ type: 'fileError', payload: { message } });
  }, []);

  const validateFile = useFileValidation({
    onError: onValidationError,
    onComplete: onValidationComplete,
  });

  const goToFirstStep = useCallback(() => {
    dispatch({ type: 'resetState' });
  }, []);

  const onFileChange = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.item(0);

      if (!file) {
        // file removed
        goToFirstStep();
        return;
      }

      dispatch({
        type: 'loadingFile',
        payload: { fileName: file.name },
      });

      validateFile(file);
    },
    [validateFile, goToFirstStep]
  );

  const onUploadFile = useCallback(async () => {
    if (isValidationStep(state)) {
      dispatch({
        type: 'uploadingFile',
      });

      try {
        const result = await uploadPrivilegedUserMonitoringFile(
          state.validatedFile.validLines.text,
          state.validatedFile.name
        );

        if (result.stats.failed > 0) {
          dispatch({
            type: 'fileUploadError',
            payload: {
              response: result,
            },
          });
        } else {
          onFileUploaded(result.stats.successful);
        }
      } catch (e) {
        dispatch({
          type: 'fileUploadError',
          payload: { errorMessage: e.message },
        });
      }
    }
  }, [onFileUploaded, state, uploadPrivilegedUserMonitoringFile]);

  const steps = useNavigationSteps(state, goToFirstStep);

  return (
    <>
      {!isErrorStep(state) && <EuiStepsHorizontal size="s" steps={steps} />}

      <EuiSpacer size="m" />

      {isFilePickerStep(state) && (
        <PrivilegedUserMonitoringFilePickerStep
          onFileChange={onFileChange}
          isLoading={state.isLoading}
          errorMessage={state.fileError}
        />
      )}

      {isValidationStep(state) && (
        <PrivilegedUserMonitoringValidationStep
          validatedFile={state.validatedFile}
          isLoading={state.isLoading}
          onReturn={goToFirstStep}
          onConfirm={onUploadFile}
        />
      )}

      {isErrorStep(state) && (
        <PrivilegedUserMonitoringErrorStep
          result={state.fileUploadResponse}
          validLinesAsText={state.validLinesAsText}
          errorMessage={state.fileUploadError}
          goToFirstStep={goToFirstStep}
          onClose={onClose}
        />
      )}
    </>
  );
};
