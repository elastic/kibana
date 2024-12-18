/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAnnotationsFromError, getStepStatus } from './helpers';
import { FileUploaderSteps } from './types';

describe('helpers', () => {
  describe('getStepStatus', () => {
    it('should return "disabled" for other steps when currentStep is 3', () => {
      const step = FileUploaderSteps.VALIDATION;
      const currentStep = FileUploaderSteps.RESULT;
      const status = getStepStatus(step, currentStep);
      expect(status).toBe('disabled');
    });

    it('should return "current" if step is equal to currentStep', () => {
      const step = FileUploaderSteps.RESULT;
      const currentStep = FileUploaderSteps.RESULT;
      const status = getStepStatus(step, currentStep);
      expect(status).toBe('current');
    });

    it('should return "complete" if step is less than currentStep', () => {
      const step = FileUploaderSteps.FILE_PICKER;
      const currentStep = FileUploaderSteps.VALIDATION;
      const status = getStepStatus(step, currentStep);
      expect(status).toBe('complete');
    });
  });

  describe('buildAnnotationsFromError', () => {
    it('should return annotations from errors', () => {
      const errors = [
        { index: 0, message: 'error 1' },
        { index: 1, message: 'error 2' },
      ];
      const annotations = {
        0: 'error 1',
        1: 'error 2',
      };

      expect(buildAnnotationsFromError(errors)).toEqual(annotations);
    });
  });
});
