/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { fetchNotesByDocumentIds } from '../store/notes.slice';
import { useFetchNotes } from './use_fetch_notes';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
}));

jest.mock('../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

jest.mock('../store/notes.slice', () => ({
  fetchNotesByDocumentIds: jest.fn(),
}));

const mockedUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockedUseIsExperimentalFeatureEnabled =
  useIsExperimentalFeatureEnabled as jest.MockedFunction<typeof useIsExperimentalFeatureEnabled>;

describe('useFetchNotes', () => {
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    mockedUseDispatch.mockReturnValue(mockDispatch);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return onLoad function', () => {
    const { result } = renderHook(() => useFetchNotes());
    expect(result.current).toHaveProperty('onLoad');
    expect(typeof result.current.onLoad).toBe('function');
  });

  it('should not dispatch action when securitySolutionNotesDisabled is true', () => {
    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    const { result } = renderHook(() => useFetchNotes());

    result.current.onLoad([{ _id: '1' }]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch action when events array is empty', () => {
    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    const { result } = renderHook(() => useFetchNotes());

    result.current.onLoad([]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should dispatch fetchNotesByDocumentIds with correct ids when conditions are met', () => {
    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    const { result } = renderHook(() => useFetchNotes());

    const events = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
    result.current.onLoad(events);

    expect(mockDispatch).toHaveBeenCalledWith(
      fetchNotesByDocumentIds({ documentIds: ['1', '2', '3'] })
    );
  });

  it('should memoize onLoad function', () => {
    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    const { result, rerender } = renderHook(() => useFetchNotes());

    const firstOnLoad = result.current.onLoad;
    rerender();
    const secondOnLoad = result.current.onLoad;

    expect(firstOnLoad).toBe(secondOnLoad);
  });

  it('should update onLoad when securitySolutionNotesDisabled changes', () => {
    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(true);
    const { result, rerender } = renderHook(() => useFetchNotes());

    const firstOnLoad = result.current.onLoad;

    mockedUseIsExperimentalFeatureEnabled.mockReturnValue(false);
    rerender();
    const secondOnLoad = result.current.onLoad;

    expect(firstOnLoad).not.toBe(secondOnLoad);
  });
});
