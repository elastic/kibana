/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { DataView } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { useTIDataView } from './use_ti_data_view';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';

jest.mock('../../../../data_view_manager/hooks/use_data_view');
jest.mock('../../../../data_view_manager/hooks/use_browser_fields');
jest.mock('../../../../data_view_manager/hooks/use_selected_patterns');

const dataView = new DataView({ fieldFormats: {} as FieldFormatsStartCommon });

describe('useTIDataView', () => {
  beforeEach(() => {
    jest.mocked(useBrowserFields).mockReturnValue({});
    jest.mocked(useSelectedPatterns).mockReturnValue(['logs-ti*']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(['pristine', 'loading'] as const)('should be loading when status is %s', (status) => {
    jest.mocked(useDataView).mockReturnValue({ dataView, status });

    const { result } = renderHook(() => useTIDataView());

    expect(result.current.loading).toBe(true);
  });

  it.each(['ready', 'error'] as const)('should not be loading when status is %s', (status) => {
    jest.mocked(useDataView).mockReturnValue({ dataView, status });

    const { result } = renderHook(() => useTIDataView());

    expect(result.current.loading).toBe(false);
  });
});
