/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStepOutput } from '.';

describe('getStepOutput', () => {
  it('returns alerts_context_count for retrieve_alerts when alertsContextCount is provided', () => {
    const result = getStepOutput({
      alertsContextCount: 42,
      discoveriesCount: undefined,
      stepId: 'retrieve_alerts',
    });

    expect(result).toEqual({ alerts_context_count: 42 });
  });

  it('returns undefined for retrieve_alerts when alertsContextCount is null', () => {
    const result = getStepOutput({
      alertsContextCount: null,
      discoveriesCount: undefined,
      stepId: 'retrieve_alerts',
    });

    expect(result).toBeUndefined();
  });

  it('returns discoveries_count for generate_discoveries when discoveriesCount is provided', () => {
    const result = getStepOutput({
      alertsContextCount: undefined,
      discoveriesCount: 7,
      stepId: 'generate_discoveries',
    });

    expect(result).toEqual({ discoveries_count: 7 });
  });

  it('returns undefined for generate_discoveries when discoveriesCount is null', () => {
    const result = getStepOutput({
      alertsContextCount: undefined,
      discoveriesCount: null,
      stepId: 'generate_discoveries',
    });

    expect(result).toBeUndefined();
  });

  it('returns discoveries_persisted for validate_discoveries when discoveriesCount is provided', () => {
    const result = getStepOutput({
      alertsContextCount: undefined,
      discoveriesCount: 7,
      stepId: 'validate_discoveries',
    });

    expect(result).toEqual({ discoveries_persisted: 7 });
  });

  it('returns undefined for an unknown stepId', () => {
    const result = getStepOutput({
      alertsContextCount: 42,
      discoveriesCount: 7,
      stepId: 'unknown_step',
    });

    expect(result).toBeUndefined();
  });
});
