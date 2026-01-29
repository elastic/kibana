/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useCreateEaseAlertsDataView } from './use_create_data_view';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useCreateDataView } from '../../../common/hooks/use_create_data_view';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

jest.mock('../../../common/hooks/use_space_id');
jest.mock('../../../common/hooks/use_create_data_view');

const dataView: DataView = createStubDataView({ spec: {} });

describe('useCreateEaseAlertsDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined and loading true while spaceId is undefined', () => {
    (useSpaceId as jest.Mock).mockReturnValue(undefined);
    (useCreateDataView as jest.Mock).mockReturnValue({ dataView: undefined, loading: true });

    const { result } = renderHook(() => useCreateEaseAlertsDataView());

    expect(result.current.dataView).toBe(undefined);
    expect(result.current.loading).toBe(true);
  });

  it('should return undefined and loading true while dataView is being created', () => {
    (useSpaceId as jest.Mock).mockReturnValue('spaceId');
    (useCreateDataView as jest.Mock).mockReturnValue({ dataView: undefined, loading: true });

    const { result } = renderHook(() => useCreateEaseAlertsDataView());

    expect(result.current.dataView).toBe(undefined);
    expect(result.current.loading).toBe(true);
  });

  it('should return dataView and loading false when ready', () => {
    (useSpaceId as jest.Mock).mockReturnValue('spaceId');
    (useCreateDataView as jest.Mock).mockReturnValue({ dataView, loading: false });

    const { result } = renderHook(() => useCreateEaseAlertsDataView());

    expect(result.current.dataView).toBe(dataView);
    expect(result.current.loading).toBe(false);
  });
});
