/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  uploadError: string;
}

export type ReducerState = FilePickerState | ValidationStepState | ErrorStepState;

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
      payload: { errorMessage: string };
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

    case 'fileUploadError':
      if (isValidationStep(state)) {
        return {
          uploadError: action.payload.errorMessage,
          step: FileUploaderSteps.ERROR,
        };
      }
      break;
  }
  return state;
};
