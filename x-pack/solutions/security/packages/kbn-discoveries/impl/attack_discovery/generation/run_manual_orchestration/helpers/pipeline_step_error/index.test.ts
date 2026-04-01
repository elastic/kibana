/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PipelineStepError } from '.';

describe('PipelineStepError', () => {
  it('preserves the error message', () => {
    const error = new PipelineStepError({
      durationMs: 5000,
      message: 'Alert retrieval failed',
      step: 'alert_retrieval',
    });

    expect(error.message).toBe('Alert retrieval failed');
  });

  it('stores the failed step', () => {
    const error = new PipelineStepError({
      durationMs: 3000,
      message: 'Generation failed',
      step: 'generation',
    });

    expect(error.step).toBe('generation');
  });

  it('stores the duration', () => {
    const error = new PipelineStepError({
      durationMs: 7500,
      message: 'Validation failed',
      step: 'validation',
    });

    expect(error.durationMs).toBe(7500);
  });

  it('is an instance of Error', () => {
    const error = new PipelineStepError({
      durationMs: 1000,
      message: 'test',
      step: 'generation',
    });

    expect(error).toBeInstanceOf(Error);
  });

  it('has the name PipelineStepError', () => {
    const error = new PipelineStepError({
      durationMs: 1000,
      message: 'test',
      step: 'generation',
    });

    expect(error.name).toBe('PipelineStepError');
  });

  it('preserves the original cause', () => {
    const originalError = new Error('original');
    const error = new PipelineStepError({
      cause: originalError,
      durationMs: 1000,
      message: 'wrapped',
      step: 'alert_retrieval',
    });

    expect(error.cause).toBe(originalError);
  });

  it('stores errorCategory when provided', () => {
    const error = new PipelineStepError({
      durationMs: 1000,
      errorCategory: 'workflow_disabled',
      message: 'Workflow is disabled',
      step: 'generation',
    });

    expect(error.errorCategory).toBe('workflow_disabled');
  });

  it('stores failedWorkflowId when provided', () => {
    const error = new PipelineStepError({
      durationMs: 1000,
      failedWorkflowId: 'wf-abc123',
      message: 'Workflow failed',
      step: 'alert_retrieval',
    });

    expect(error.failedWorkflowId).toBe('wf-abc123');
  });

  it('errorCategory is undefined when not provided', () => {
    const error = new PipelineStepError({
      durationMs: 1000,
      message: 'test',
      step: 'generation',
    });

    expect(error.errorCategory).toBeUndefined();
  });

  it('failedWorkflowId is undefined when not provided', () => {
    const error = new PipelineStepError({
      durationMs: 1000,
      message: 'test',
      step: 'generation',
    });

    expect(error.failedWorkflowId).toBeUndefined();
  });
});
