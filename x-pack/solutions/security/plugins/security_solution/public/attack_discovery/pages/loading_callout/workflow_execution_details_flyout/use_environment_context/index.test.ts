/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';

import { KibanaServices } from '../../../../../common/lib/kibana';
import { getEnvironmentContext } from '../helpers/get_environment_context';
import { useEnvironmentContext } from '.';

jest.mock('../../../../../common/lib/kibana', () => ({
  KibanaServices: {
    getKibanaVersion: jest.fn().mockReturnValue('8.0.0'),
  },
}));

jest.mock('../helpers/get_environment_context');

const mockGetEnvironmentContext = getEnvironmentContext as jest.Mock;

const mockSpaces = {
  getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
};

describe('useEnvironmentContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetEnvironmentContext.mockResolvedValue({
      kibanaVersion: '8.0.0',
      spaceId: 'default',
    });
  });

  it('returns undefined before the context resolves', () => {
    mockGetEnvironmentContext.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useEnvironmentContext(mockSpaces));

    expect(result.current).toBeUndefined();
  });

  it('returns the resolved environment context', async () => {
    const { result } = renderHook(() => useEnvironmentContext(mockSpaces));

    await act(async () => {});

    expect(result.current).toEqual({ kibanaVersion: '8.0.0', spaceId: 'default' });
  });

  it('calls getEnvironmentContext with kibanaVersion and spaces', async () => {
    renderHook(() => useEnvironmentContext(mockSpaces));

    await act(async () => {});

    expect(mockGetEnvironmentContext).toHaveBeenCalledWith({
      kibanaVersion: '8.0.0',
      spaces: mockSpaces,
    });
  });

  it('calls getKibanaVersion to populate the version', async () => {
    renderHook(() => useEnvironmentContext(mockSpaces));

    await act(async () => {});

    expect(KibanaServices.getKibanaVersion).toHaveBeenCalled();
  });

  it('handles undefined spaces gracefully', async () => {
    mockGetEnvironmentContext.mockResolvedValue({ kibanaVersion: '8.0.0', spaceId: undefined });

    const { result } = renderHook(() => useEnvironmentContext(undefined));

    await act(async () => {});

    expect(result.current).toEqual({ kibanaVersion: '8.0.0', spaceId: undefined });
  });
});
