/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCurrentDataViewFields } from './use_current_data_view_fields';
import { useTIDataView } from './use_ti_data_view';

jest.mock('./use_ti_data_view');

describe('useFields', () => {
  it('should return fields from sourcererDataView', () => {
    const mockFields = { field1: {}, field2: {} };
    (useTIDataView as jest.Mock).mockReturnValue({
      sourcererDataView: { fields: mockFields },
    });

    const { result } = renderHook(() => useCurrentDataViewFields());

    expect(result.current).toEqual(Object.values(mockFields));
  });

  it('should return an empty array if fields are undefined', () => {
    (useTIDataView as jest.Mock).mockReturnValue({
      sourcererDataView: { fields: undefined },
    });

    const { result } = renderHook(() => useCurrentDataViewFields());

    expect(result.current).toEqual([]);
  });
});
