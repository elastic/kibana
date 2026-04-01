/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getGenerationStatus } from '.';

describe('getGenerationStatus', () => {
  it('returns "running" for generation-started', () => {
    expect(getGenerationStatus('generation-started')).toBe('running');
  });

  it('returns "succeeded" for generation-succeeded', () => {
    expect(getGenerationStatus('generation-succeeded')).toBe('succeeded');
  });

  it('returns "failed" for generation-failed', () => {
    expect(getGenerationStatus('generation-failed')).toBe('failed');
  });

  it('returns "unknown" for an unrecognized action', () => {
    expect(getGenerationStatus('alert-retrieval-started')).toBe('unknown');
  });

  it('returns "unknown" for undefined', () => {
    expect(getGenerationStatus(undefined)).toBe('unknown');
  });
});
