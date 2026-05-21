/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiStepsHorizontal } from '@elastic/eui';
import React, { useCallback, useReducer } from 'react';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { EntityResolutionFilePickerStep } from './components/file_picker_step';
import { EntityResolutionValidationStep } from './components/validation_step';
import { EntityResolutionResultStep } from './components/result_step';
import { INITIAL_STATE, reducer } from './reducer';
import { isFilePickerStep, isResultStep, isValidationStep } from './helpers';
import { useFileValidation, useNavigationSteps } from './hooks';
import type { OnCompleteParams, ResolutionCsvUploadResponse } from './types';
import { ENTITY_RESOLUTION_CSV_UPLOAD_URL } from '../../../../common/entity_analytics/entity_store/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';

export const EntityResolutionFileUploader: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { http } = useKibana().services;

  const onValidationComplete = useCallback(({ validatedFile }: OnCompleteParams) => {
    dispatch({
      type: 'fileValidated',
      payload: { validatedFile },
    });
  }, []);

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
        goToFirstStep();
        return;
      }
      dispatch({ type: 'loadingFile', payload: { fileName: file.name } });
      validateFile(file);
    },
    [validateFile, goToFirstStep]
  );

  const onUploadFile = useCallback(async () => {
    if (isValidationStep(state)) {
      dispatch({ type: 'uploadingFile' });

      try {
        const file = new File(
          [new Blob([state.validatedFile.validLines.text])],
          state.validatedFile.name,
          { type: 'text/csv' }
        );
        const body = new FormData();
        body.append('file', file);

        const result = await http.fetch<ResolutionCsvUploadResponse>(
          ENTITY_RESOLUTION_CSV_UPLOAD_URL,
          {
            version: API_VERSIONS.internal.v1,
            method: 'POST',
            headers: { 'Content-Type': undefined }, // Let the browser set multipart/form-data boundary
            body,
          }
        );

        dispatch({ type: 'fileUploaded', payload: { response: result } });
      } catch (e) {
        dispatch({ type: 'fileUploaded', payload: { errorMessage: e.message } });
      }
    }
  }, [state, http]);

  const steps = useNavigationSteps(state, goToFirstStep);

  return (
    <div>
      <EuiStepsHorizontal size="s" steps={steps} />
      <EuiSpacer size="l" />
      <div>
        {isFilePickerStep(state) && (
          <EntityResolutionFilePickerStep
            onFileChange={onFileChange}
            isLoading={state.isLoading}
            errorMessage={state.fileError}
          />
        )}
        {isValidationStep(state) && (
          <EntityResolutionValidationStep
            validatedFile={state.validatedFile}
            isLoading={state.isLoading}
            onReturn={goToFirstStep}
            onConfirm={onUploadFile}
          />
        )}
        {isResultStep(state) && (
          <EntityResolutionResultStep
            result={state.uploadResponse}
            errorMessage={state.uploadError}
            onReturn={goToFirstStep}
          />
        )}
      </div>
    </div>
  );
};
