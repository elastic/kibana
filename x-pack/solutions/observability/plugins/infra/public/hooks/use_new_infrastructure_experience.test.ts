/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { useNewInfrastructureExperience } from './use_new_infrastructure_experience';

jest.mock('./use_kibana_space', () => ({
  useActiveKibanaSpace: jest.fn(),
}));

const { useActiveKibanaSpace } = jest.requireMock('./use_kibana_space');

const mockSpace = (id: string) =>
  useActiveKibanaSpace.mockReturnValue({
    isLoading: false,
    error: undefined,
    space: { id, name: id, disabledFeatures: [] },
  });

const mockSpaceError = () =>
  useActiveKibanaSpace.mockReturnValue({
    isLoading: false,
    error: new Error('spaces unavailable'),
    space: undefined,
  });

describe('useNewInfrastructureExperience', () => {
  beforeEach(() => {
    localStorage.clear();
    mockSpace('default');
  });

  it('returns false by default', () => {
    const { result } = renderHook(() => useNewInfrastructureExperience());
    expect(result.current[0]).toBe(false);
  });

  it('scopes the preference to the active space', () => {
    mockSpace('my-space');
    localStorage.setItem('newInfrastructureExperience:my-space', 'true');

    const { result } = renderHook(() => useNewInfrastructureExperience());
    expect(result.current[0]).toBe(true);
  });

  it('does not read the preference of a different space', () => {
    mockSpace('space-a');
    localStorage.setItem('newInfrastructureExperience:space-b', 'true');

    const { result } = renderHook(() => useNewInfrastructureExperience());
    expect(result.current[0]).toBe(false);
  });

  it('falls back to DEFAULT_SPACE_ID when the space cannot be resolved', () => {
    mockSpaceError();
    localStorage.setItem(`newInfrastructureExperience:${DEFAULT_SPACE_ID}`, 'true');

    const { result } = renderHook(() => useNewInfrastructureExperience());
    expect(result.current[0]).toBe(true);
  });
});
