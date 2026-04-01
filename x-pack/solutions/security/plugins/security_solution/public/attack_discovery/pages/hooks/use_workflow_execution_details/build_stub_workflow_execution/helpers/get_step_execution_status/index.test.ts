/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';

import { getStepExecutionStatus } from '.';

describe('getStepExecutionStatus', () => {
  describe('when eventActions is empty or undefined', () => {
    it('returns RUNNING for the first step when fallbackStatus is RUNNING', () => {
      const result = getStepExecutionStatus({
        eventActions: undefined,
        fallbackStatus: ExecutionStatus.RUNNING,
        stepId: 'retrieve_alerts',
      });

      expect(result).toBe(ExecutionStatus.RUNNING);
    });

    it('returns PENDING for non-first steps when fallbackStatus is RUNNING', () => {
      const result = getStepExecutionStatus({
        eventActions: [],
        fallbackStatus: ExecutionStatus.RUNNING,
        stepId: 'generate_discoveries',
      });

      expect(result).toBe(ExecutionStatus.PENDING);
    });

    it('returns fallbackStatus for any step when fallbackStatus is not RUNNING', () => {
      const result = getStepExecutionStatus({
        eventActions: null,
        fallbackStatus: ExecutionStatus.COMPLETED,
        stepId: 'generate_discoveries',
      });

      expect(result).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('when eventActions are available', () => {
    it('returns COMPLETED for retrieve_alerts when alert retrieval step is done', () => {
      const result = getStepExecutionStatus({
        eventActions: ['step-start', 'step-complete', 'step-start'],
        fallbackStatus: ExecutionStatus.RUNNING,
        stepId: 'retrieve_alerts',
      });

      expect(result).toBe(ExecutionStatus.COMPLETED);
    });

    it('returns RUNNING for generate_discoveries when generation step is in progress', () => {
      const result = getStepExecutionStatus({
        eventActions: ['step-start', 'step-complete', 'step-start'],
        fallbackStatus: ExecutionStatus.RUNNING,
        stepId: 'generate_discoveries',
      });

      expect(result).toBe(ExecutionStatus.RUNNING);
    });

    it('returns PENDING for validate_discoveries when only alert retrieval and generation have started', () => {
      const result = getStepExecutionStatus({
        eventActions: ['step-start', 'step-complete', 'step-start'],
        fallbackStatus: ExecutionStatus.RUNNING,
        stepId: 'validate_discoveries',
      });

      expect(result).toBe(ExecutionStatus.PENDING);
    });

    it('returns fallbackStatus for unknown stepId', () => {
      const result = getStepExecutionStatus({
        eventActions: ['step-start', 'step-complete'],
        fallbackStatus: ExecutionStatus.RUNNING,
        stepId: 'unknown_step',
      });

      expect(result).toBe(ExecutionStatus.RUNNING);
    });
  });
});
