/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRestoreDataViewManagerStateFromURL } from './use_sync_url_state';
import * as globalQueryString from '../../common/utils/global_query_string';

import { PageScope } from '../constants';

jest.mock('../../common/utils/global_query_string');

describe('useRestoreDataViewManagerStateFromURL', () => {
  const mockUseInitializeUrlParam = globalQueryString.useInitializeUrlParam as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInitializeUrlParam.mockImplementation((_key, cb) => cb);
  });

  it('should call initDataViewSelection for each scope', () => {
    const initDataViewSelection = jest.fn();
    renderHook(() =>
      useRestoreDataViewManagerStateFromURL(initDataViewSelection, PageScope.default)
    );
    const onInitializeUrlParam = mockUseInitializeUrlParam.mock.calls[0][1];
    onInitializeUrlParam({
      default: { id: 'test-id', selectedPatterns: ['a'] },
      detections: { id: 'det-id', selectedPatterns: ['b'] },
    });
    expect(initDataViewSelection).toHaveBeenCalledWith([
      { fallbackPatterns: ['a'], id: 'test-id', scope: 'default' },
      { fallbackPatterns: ['b'], id: 'det-id', scope: 'detections' },
    ]);
  });
});
