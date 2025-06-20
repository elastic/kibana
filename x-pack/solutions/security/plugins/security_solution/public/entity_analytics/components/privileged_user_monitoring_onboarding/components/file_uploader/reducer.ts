/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivmonBulkUploadUsersCSVResponse } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/upload_csv.gen';
import { FileUploaderSteps } from './types';
import type { ValidatedFile } from './types';
import { isFilePickerStep, isValidationStep } from './helpers';

export interface FilePickerState {
  isLoading: boolean;
  step: FileUploaderSteps.FILE_PICKER;
  fileError?: string;
  fileName?: string;
}

export interface ValidationStepState {
  isLoading: boolean;
  step: FileUploaderSteps.VALIDATION;
  fileError?: string;
  validatedFile: ValidatedFile;
}

export interface ErrorStepState {
  step: FileUploaderSteps.ERROR;
  fileUploadError?: string;
  fileUploadResponse?: PrivmonBulkUploadUsersCSVResponse;
  validLinesAsText: string;
}

export interface ResultStepState {
  step: FileUploaderSteps.RESULT;
  fileUploadResponse?: PrivmonBulkUploadUsersCSVResponse;
  fileUploadError?: string;
  validLinesAsText: string;
}

export type ReducerState = FilePickerState | ValidationStepState | ErrorStepState | ResultStepState;

export type ReducerAction =
  | { type: 'loadingFile'; payload: { fileName: string } }
  | { type: 'resetState' }
  | {
      type: 'fileValidated';
      payload: {
        validatedFile: ValidatedFile;
      };
    }
  | { type: 'fileError'; payload: { message: string } }
  | { type: 'uploadingFile' }
  | {
      type: 'fileUploadError';
      payload: { errorMessage?: string; response?: PrivmonBulkUploadUsersCSVResponse };
    }
  | {
      type: 'fileUploaded';
      payload: { response?: PrivmonBulkUploadUsersCSVResponse; errorMessage?: string };
    };

export const INITIAL_STATE: FilePickerState = {
  isLoading: false,
  step: FileUploaderSteps.FILE_PICKER,
};

export const reducer = (state: ReducerState, action: ReducerAction): ReducerState => {
  switch (action.type) {
    case 'resetState':
      return INITIAL_STATE;

    case 'loadingFile':
      if (isFilePickerStep(state)) {
        return {
          ...state,
          isLoading: true,
          fileName: action.payload.fileName,
        };
      }
      break;

    case 'fileError':
      return {
        isLoading: false,
        step: FileUploaderSteps.FILE_PICKER,
        fileError: action.payload.message,
      };

    case 'fileValidated':
      return {
        isLoading: false,
        step: FileUploaderSteps.VALIDATION,
        ...action.payload,
      };

    case 'uploadingFile':
      if (isValidationStep(state)) {
        return {
          ...state,
          isLoading: true,
        };
      }
      break;
    case 'fileUploaded':
      if (isValidationStep(state)) {
        return {
          fileUploadResponse: action.payload.response,
          fileUploadError: action.payload.errorMessage,
          validLinesAsText: state.validatedFile.validLines.text,
          step: FileUploaderSteps.RESULT,
        };
      }
      break;
    case 'fileUploadError':
      if (isValidationStep(state)) {
        return {
          fileUploadError: action.payload.errorMessage,
          step: FileUploaderSteps.ERROR,
          fileUploadResponse: action.payload.response,
          validLinesAsText: state.validatedFile.validLines.text,
        };
      }
      break;
  }
  return state;
};
