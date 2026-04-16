/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGenerationStatus } from '.';

const mockGenerationResult = {
  alertsContextCount: 1,
  attackDiscoveries: [],
  executionUuid: 'test-uuid',
  replacements: {},
  workflowId: 'generation',
  workflowRunId: 'generation-run',
};

describe('getGenerationStatus', () => {
  it('returns succeeded when generationResult is present', () => {
    const result = getGenerationStatus({
      failedStep: undefined,
      generationResult: mockGenerationResult,
    });

    expect(result).toBe('succeeded');
  });

  it('returns failed when generationResult is absent and failedStep is generation', () => {
    const result = getGenerationStatus({
      failedStep: 'generation',
      generationResult: undefined,
    });

    expect(result).toBe('failed');
  });

  it('returns not_started when generationResult is absent and failedStep is not generation', () => {
    const result = getGenerationStatus({
      failedStep: 'retrieval',
      generationResult: undefined,
    });

    expect(result).toBe('not_started');
  });

  it('returns not_started when both generationResult and failedStep are absent', () => {
    const result = getGenerationStatus({
      failedStep: undefined,
      generationResult: undefined,
    });

    expect(result).toBe('not_started');
  });
});
