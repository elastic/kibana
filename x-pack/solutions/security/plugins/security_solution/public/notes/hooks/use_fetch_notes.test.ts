/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useDispatch } from 'react-redux-v7';
import { fetchNotesByDocumentIds } from '../store/notes.slice';
import { useFetchNotes } from './use_fetch_notes';
import { useUserPrivileges } from '../../common/components/user_privileges';

vi.mock('react-redux-v7', () => {
      const mocked = {
      useDispatch: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/hooks/use_experimental_features', () => {
      const mocked = {
      useIsExperimentalFeatureEnabled: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../store/notes.slice', () => {
      const mocked = {
      fetchNotesByDocumentIds: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../common/components/user_privileges');

const mockedUseDispatch = useDispatch as MockedFunction<typeof useDispatch>;

describe('useFetchNotes', () => {
  let mockDispatch: Mock;

  beforeEach(() => {
    mockDispatch = vi.fn();
    mockedUseDispatch.mockReturnValue(mockDispatch);
    (useUserPrivileges as Mock).mockReturnValue({
      notesPrivileges: { read: true },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return onLoad function', () => {
    const { result } = renderHook(() => useFetchNotes());
    expect(result.current).toHaveProperty('onLoad');
    expect(typeof result.current.onLoad).toBe('function');
  });

  it('should not dispatch action when events array is empty', () => {
    const { result } = renderHook(() => useFetchNotes());

    result.current.onLoad([]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should not dispatch action when user has insufficient privileges', () => {
    (useUserPrivileges as Mock).mockReturnValue({
      notesPrivileges: { read: false },
    });
    const { result } = renderHook(() => useFetchNotes());

    const events = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
    result.current.onLoad(events);

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('should dispatch fetchNotesByDocumentIds with correct ids when conditions are met', () => {
    const { result } = renderHook(() => useFetchNotes());

    const events = [{ _id: '1' }, { _id: '2' }, { _id: '3' }];
    result.current.onLoad(events);

    expect(mockDispatch).toHaveBeenCalledWith(
      fetchNotesByDocumentIds({ documentIds: ['1', '2', '3'] })
    );
  });

  it('should memoize onLoad function', () => {
    const { result, rerender } = renderHook(() => useFetchNotes());

    const firstOnLoad = result.current.onLoad;
    rerender();
    const secondOnLoad = result.current.onLoad;

    expect(firstOnLoad).toBe(secondOnLoad);
  });
});
