/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PartialSetupState } from './setup';
import { mergePartialSetupStates, areResourcesSetup, createDefaultSetupState } from './setup';

const createDataState = (available: boolean): PartialSetupState => ({ data: { available } });

function createResourceState({
  enabled,
  created,
}: {
  enabled: boolean;
  created: boolean;
}): PartialSetupState {
  return {
    resource_management: {
      enabled,
    },
    resources: {
      created,
    },
  };
}

function createProfilingState(enabled: boolean): PartialSetupState {
  return {
    profiling: {
      enabled,
    },
  };
}

describe('Merging partial state operations', () => {
  const defaultSetupState = createDefaultSetupState();

  it('returns partial states with missing key', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [createDataState(true)]);
    expect(mergedState.data.available).toEqual(true);
    expect(mergedState.resources.created).toEqual(false);
  });

  it('should deeply nested partial states with overlap', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ created: true, enabled: true }),
    ]);

    expect(mergedState.resource_management.enabled).toEqual(true);
    expect(mergedState.resources.created).toEqual(true);
  });

  it('returns false when resource management is not enabled', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: false, created: true }),
      createProfilingState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when resources are not created', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: true, created: false }),
      createProfilingState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when profiling is not enabled', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: true, created: true }),
      createProfilingState(false),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns true when all checks are valid', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: true, created: true }),
      createProfilingState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeTruthy();
  });
});
