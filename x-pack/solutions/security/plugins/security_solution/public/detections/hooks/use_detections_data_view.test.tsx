/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';

import { useDetectionsDataView } from './use_detections_data_view';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSourcererDataView } from '../../sourcerer/containers';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { SourcererScopeName } from '../../sourcerer/store/model';

jest.mock('../../sourcerer/containers');
jest.mock('../../common/hooks/use_experimental_features');
jest.mock('../../data_view_manager/hooks/use_data_view');

const dataView: DataView = createStubDataView({ spec: {} });
const dataViewSpec: DataViewSpec = createStubDataView({ spec: {} }).toSpec();

describe('useDetectionsDataView', () => {
  describe('newDataViewPickerEnabled false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
      (useDataView as jest.Mock).mockReturnValue({});
    });

    it('returns loading true when old sourcerer is loading', () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: true,
        sourcererDataView: dataViewSpec,
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isDataViewInvalid true when old sourcerer data view is undefined', () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: undefined,
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isDataViewInvalid).toBe(true);
    });

    it('returns isDataViewInvalid true when old sourcerer data view has no id', () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: { ...dataViewSpec, id: undefined, title: 'title' },
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isDataViewInvalid).toBe(true);
    });

    it('returns isDataViewInvalid true when old sourcerer data view has no title', () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: { ...dataViewSpec, id: 'id', title: '' },
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isDataViewInvalid).toBe(true);
    });

    it('returns a valid response', () => {
      (useSourcererDataView as jest.Mock).mockReturnValue({
        loading: false,
        sourcererDataView: { ...dataViewSpec, id: 'id', title: 'title' },
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isDataViewInvalid).toBe(false);
      expect(result.current.dataView).toBe(undefined);
      expect(result.current.oldSourcererDataViewSpec).toEqual({
        ...dataViewSpec,
        id: 'id',
        title: 'title',
      });
      expect(result.current.runtimeMappings).toEqual({});
    });
  });

  describe('newDataViewPickerEnabled true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
      (useSourcererDataView as jest.Mock).mockReturnValue({});
    });

    it('returns loading true when data view status is pristine', () => {
      (useDataView as jest.Mock).mockReturnValue({ dataView, status: 'pristine' });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isLoading).toBe(true);
    });

    it('returns loading true when data view status is loading', () => {
      (useDataView as jest.Mock).mockReturnValue({ dataView, status: 'loading' });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isDataViewInvalid true when data view status is error', () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: undefined,
        status: 'error',
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isDataViewInvalid).toBe(true);
    });

    it('returns isDataViewInvalid true when data view has no matched indices', () => {
      (useDataView as jest.Mock).mockReturnValue({
        dataView: {
          ...dataView,
          getRuntimeMappings: jest.fn().mockReturnValue({}),
          hasMatchedIndices: jest.fn().mockReturnValue(false),
        },
        status: 'ready',
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isDataViewInvalid).toBe(true);
    });

    it('returns a valid response', () => {
      const mockDataView = {
        ...dataView,
        id: 'id',
        title: 'title',
        getRuntimeMappings: jest.fn().mockReturnValue({ runtime: 'mappings' }),
        hasMatchedIndices: jest.fn().mockReturnValue(true),
      };
      (useDataView as jest.Mock).mockReturnValue({
        dataView: mockDataView,
        status: 'ready',
      });

      const { result } = renderHook(() => useDetectionsDataView(SourcererScopeName.detections));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isDataViewInvalid).toBe(false);
      expect(result.current.dataView).toEqual(mockDataView);
      expect(result.current.oldSourcererDataViewSpec).toBe(undefined);
      expect(result.current.runtimeMappings).toEqual({ runtime: 'mappings' });
    });
  });
});
