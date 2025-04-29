/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  FilePickerState,
  ValidationStepState,
  ResultStepState,
  ReducerState,
} from './reducer';
import { FileUploaderSteps } from './types';

export const getStepStatus = (step: FileUploaderSteps, currentStep: FileUploaderSteps) => {
  if (step < FileUploaderSteps.RESULT && currentStep === FileUploaderSteps.RESULT) {
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

export const isResultStep = (state: ReducerState): state is ResultStepState =>
  state.step === FileUploaderSteps.RESULT;

export const buildAnnotationsFromError = (
  errors: Array<{ message: string; index: number }>
): Record<number, string> => {
  const annotations: Record<number, string> = {};

  errors.forEach((e) => {
    annotations[e.index] = e.message;
  });

  return annotations;
};

export const formatTimeFromNow = (time: string | undefined): string => {
  if (!time) {
    return '';
  }

  const scheduleTime = moment(time);
  return scheduleTime.fromNow(true);
};
