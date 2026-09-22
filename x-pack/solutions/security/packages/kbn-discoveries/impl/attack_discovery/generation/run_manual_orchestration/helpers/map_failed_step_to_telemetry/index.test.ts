/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapFailedStepToTelemetry } from '.';

const baseParams = {
  defaultAlertRetrievalWorkflowId: 'alert-retrieval-workflow',
  generationWorkflowId: 'generation-workflow',
  stepTimings: { generation: 2000, retrieval: 1000, validation: 3000 },
  validationWorkflowId: 'validation-workflow',
};

describe('mapFailedStepToTelemetry', () => {
  describe('when failedStep is retrieval', () => {
    it('returns alert_retrieval as the telemetry step name', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'retrieval' });

      expect(result.step).toBe('alert_retrieval');
    });

    it('returns the retrieval duration', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'retrieval' });

      expect(result.durationMs).toBe(1000);
    });

    it('returns the default alert retrieval workflow ID', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'retrieval' });

      expect(result.workflowId).toBe('alert-retrieval-workflow');
    });
  });

  describe('when failedStep is generation', () => {
    it('returns generation as the telemetry step name', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'generation' });

      expect(result.step).toBe('generation');
    });

    it('returns the generation duration', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'generation' });

      expect(result.durationMs).toBe(2000);
    });

    it('returns the generation workflow ID', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'generation' });

      expect(result.workflowId).toBe('generation-workflow');
    });
  });

  describe('when failedStep is validation', () => {
    it('returns validation as the telemetry step name', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'validation' });

      expect(result.step).toBe('validation');
    });

    it('returns the validation duration', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'validation' });

      expect(result.durationMs).toBe(3000);
    });

    it('returns the validation workflow ID', () => {
      const result = mapFailedStepToTelemetry({ ...baseParams, failedStep: 'validation' });

      expect(result.workflowId).toBe('validation-workflow');
    });
  });
});
