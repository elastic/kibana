/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { renderHook } from '@testing-library/react';
import { useSourcererDataView } from '../containers';
import { mockSourcererScope } from '../containers/mocks';
import { SourcererScopeName } from '../store/model';
import type { UseGetScopedSourcererDataViewArgs } from './use_get_sourcerer_data_view';
import { useGetScopedSourcererDataView } from './use_get_sourcerer_data_view';

const renderHookCustom = (args: UseGetScopedSourcererDataViewArgs) => {
  return renderHook(({ sourcererScope }) => useGetScopedSourcererDataView({ sourcererScope }), {
    initialProps: {
      ...args,
    },
  });
};

jest.mock('../containers');

const mockGetSourcererDataView = jest.fn(() => mockSourcererScope);

describe('useGetScopedSourcererDataView', () => {
  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockImplementation(mockGetSourcererDataView);
  });
  it('should return DataView when correct spec is provided', () => {
    const { result } = renderHookCustom({ sourcererScope: SourcererScopeName.timeline });

    expect(result.current).toBeInstanceOf(DataView);
  });
  it('should return undefined when no spec is provided', () => {
    mockGetSourcererDataView.mockReturnValueOnce({
      ...mockSourcererScope,
      sourcererDataView: {},
    });
    const { result } = renderHookCustom({ sourcererScope: SourcererScopeName.timeline });
    expect(result.current).toBeUndefined();
  });
  it('should return undefined when no spec is provided and should update the return when spec is updated to correct value', () => {
    mockGetSourcererDataView.mockReturnValueOnce({
      ...mockSourcererScope,
      sourcererDataView: {},
    });
    const { rerender, result } = renderHookCustom({ sourcererScope: SourcererScopeName.timeline });
    expect(result.current).toBeUndefined();

    rerender({ sourcererScope: SourcererScopeName.timeline });
    expect(result.current).toBeInstanceOf(DataView);
  });
});
