/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilePickerState, ValidationStepState, ReducerState, ErrorStepState } from './reducer';
import { FileUploaderSteps } from './types';

export const getStepStatus = (step: FileUploaderSteps, currentStep: FileUploaderSteps) => {
  if (currentStep === FileUploaderSteps.ERROR) {
    return 'disabled';
  }

  if (currentStep === step) {
    return 'current';
  }

  if (currentStep > step) {
    return 'complete';
  }

  return 'disabled';
};

export const isFilePickerStep = (state: ReducerState): state is FilePickerState =>
  state.step === FileUploaderSteps.FILE_PICKER;

export const isValidationStep = (state: ReducerState): state is ValidationStepState =>
  state.step === FileUploaderSteps.VALIDATION;

export const isErrorStep = (state: ReducerState): state is ErrorStepState =>
  state.step === FileUploaderSteps.ERROR;

export const buildAnnotationsFromError = (
  errors: Array<{ message: string; index: number | null }>
): Record<number, string> => {
  const annotations: Record<number, string> = {};

  errors.forEach((e) => {
    if (e.index !== undefined && e.index !== null) {
      annotations[e.index] = e.message;
    }
  });

  return annotations;
};
