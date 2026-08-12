/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { getStepStatusFromEvents } from '.';

describe('getStepStatusFromEvents', () => {
  it('returns pending statuses when eventActions is empty', () => {
    const eventActions: string[] = [];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.PENDING,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns pending statuses when eventActions contains no step lifecycle actions', () => {
    const eventActions = ['workflow-start', 'kibana-action', 'http_request-start'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.PENDING,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns alertRetrieval running after first step-start', () => {
    const eventActions = ['step-start'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.RUNNING,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns alertRetrieval completed after step-start then step-complete', () => {
    const eventActions = ['step-start', 'step-complete'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.COMPLETED,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns alertRetrieval failed after step-start then step-fail', () => {
    const eventActions = ['step-start', 'step-fail'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.FAILED,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns generation running after alertRetrieval completes and next step starts', () => {
    const eventActions = ['step-start', 'step-complete', 'step-start'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.COMPLETED,
      generation: ExecutionStatus.RUNNING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns generation completed after second step completes', () => {
    const eventActions = ['step-start', 'step-complete', 'step-start', 'step-complete'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.COMPLETED,
      generation: ExecutionStatus.COMPLETED,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns all steps completed when three steps complete', () => {
    const eventActions = [
      'step-start',
      'step-complete',
      'step-start',
      'step-complete',
      'step-start',
      'step-complete',
    ];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.COMPLETED,
      generation: ExecutionStatus.COMPLETED,
      validation: ExecutionStatus.COMPLETED,
    });
  });

  it('returns validation pending when generation fails', () => {
    const eventActions = ['step-start', 'step-complete', 'step-start', 'step-fail'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.COMPLETED,
      generation: ExecutionStatus.FAILED,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns alertRetrieval completed when step-complete occurs without step-start', () => {
    const eventActions = ['step-complete'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.COMPLETED,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('returns alertRetrieval failed when step-fail occurs without step-start', () => {
    const eventActions = ['step-fail'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.FAILED,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });

  it('does not advance to the next step when a step-start is duplicated', () => {
    const eventActions = ['step-start', 'step-start'];

    const result = getStepStatusFromEvents(eventActions);

    expect(result).toEqual({
      alertRetrieval: ExecutionStatus.RUNNING,
      generation: ExecutionStatus.PENDING,
      validation: ExecutionStatus.PENDING,
    });
  });
});
