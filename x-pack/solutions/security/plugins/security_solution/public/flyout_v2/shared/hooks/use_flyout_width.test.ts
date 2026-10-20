/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useSystemFlyoutSize } from '@kbn/core-overlays-browser';
import { getStoredFlyoutWidth, setStoredFlyoutWidth, useFlyoutSize } from './use_flyout_width';
import { FLYOUT_WIDTH_LOCAL_STORAGE } from '../constants/local_storage';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');
jest.mock('@kbn/core-overlays-browser', () => ({
  useSystemFlyoutSize: jest.fn(),
}));

const mockStorage = { get: jest.fn(), set: jest.fn(), remove: jest.fn() };
const storage = mockStorage as unknown as Storage;

describe('getStoredFlyoutWidth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the stored positive number', () => {
    mockStorage.get.mockReturnValue(640);
    expect(getStoredFlyoutWidth(storage)).toBe(640);
    expect(mockStorage.get).toHaveBeenCalledWith(FLYOUT_WIDTH_LOCAL_STORAGE);
  });

  it('returns undefined when nothing is stored', () => {
    mockStorage.get.mockReturnValue(undefined);
    expect(getStoredFlyoutWidth(storage)).toBeUndefined();
  });

  it('returns undefined for a non-positive or non-numeric value', () => {
    mockStorage.get.mockReturnValue(0);
    expect(getStoredFlyoutWidth(storage)).toBeUndefined();
    mockStorage.get.mockReturnValue('640');
    expect(getStoredFlyoutWidth(storage)).toBeUndefined();
  });
});

describe('setStoredFlyoutWidth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('persists the width', () => {
    setStoredFlyoutWidth(storage, 720);
    expect(mockStorage.set).toHaveBeenCalledWith(FLYOUT_WIDTH_LOCAL_STORAGE, 720);
  });
});

describe('useFlyoutSize', () => {
  const mockResetSize = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { storage: mockStorage } });
    (useSystemFlyoutSize as jest.Mock).mockReturnValue({ size: 's', resetSize: mockResetSize });
    mockStorage.get.mockReturnValue(undefined);
  });

  it('reports no custom width when none is stored', () => {
    mockStorage.get.mockReturnValue(undefined);
    const { result } = renderHook(() => useFlyoutSize());
    expect(result.current.hasCustomWidth).toBe(false);
  });

  it('reports a custom width when one is stored', () => {
    mockStorage.get.mockReturnValue(640);
    const { result } = renderHook(() => useFlyoutSize());
    expect(result.current.hasCustomWidth).toBe(true);
  });

  it('clears the stored width and resets the open flyout on reset', () => {
    mockStorage.get.mockReturnValue(640);
    const { result } = renderHook(() => useFlyoutSize());

    act(() => result.current.resetSize());

    expect(mockStorage.remove).toHaveBeenCalledWith(FLYOUT_WIDTH_LOCAL_STORAGE);
    expect(mockResetSize).toHaveBeenCalledTimes(1);
  });

  it('still clears the stored width when there is no open flyout context', () => {
    (useSystemFlyoutSize as jest.Mock).mockReturnValue(undefined);
    const { result } = renderHook(() => useFlyoutSize());

    act(() => result.current.resetSize());

    expect(mockStorage.remove).toHaveBeenCalledWith(FLYOUT_WIDTH_LOCAL_STORAGE);
  });
});
