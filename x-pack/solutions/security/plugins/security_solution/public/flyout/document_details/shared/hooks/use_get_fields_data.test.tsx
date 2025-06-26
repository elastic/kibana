/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { mockSearchHit } from '../mocks/mock_search_hit';
import type { UseGetFieldsDataParams, UseGetFieldsDataResult } from './use_get_fields_data';
import { useGetFieldsData } from './use_get_fields_data';

const fieldsData = {
  ...mockSearchHit.fields,
  field: ['value'],
};

describe('useGetFieldsData', () => {
  let hookResult: RenderHookResult<UseGetFieldsDataResult, UseGetFieldsDataParams>;

  it('should return the value for a field', () => {
    hookResult = renderHook(() => useGetFieldsData({ fieldsData }));

    const getFieldsData = hookResult.result.current.getFieldsData;
    expect(getFieldsData('field')).toEqual(['value']);
    expect(getFieldsData('wrong_field')).toEqual(undefined);
  });

  it('should handle undefined', () => {
    hookResult = renderHook(() => useGetFieldsData({ fieldsData: undefined }));

    const getFieldsData = hookResult.result.current.getFieldsData;
    expect(getFieldsData('field')).toEqual(undefined);
  });
});
