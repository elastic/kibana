/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useCreateAdhocDataView } from './use_create_adhoc_data_view';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import * as i18n from './translations';
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockedUseKibana = mockUseKibana();
mockedUseKibana.services.dataViews = { create: jest.fn() };
mockedUseKibana.services.uiSettings = { get: jest.fn().mockReturnValue([]) };

jest.mock('../../common/hooks/use_app_toasts', () => {
  const original = jest.requireActual('../../common/hooks/use_app_toasts');

  return {
    ...original,
    useAppToasts: () => ({
      addSuccess: mockAddSuccess,
      addError: mockAddError,
    }),
  };
});
jest.mock('../../common/lib/kibana', () => {
  return {
    useKibana: () => mockedUseKibana,
  };
});
jest.mock('@kbn/react-kibana-mount', () => {
  const original = jest.requireActual('@kbn/react-kibana-mount');

  return {
    ...original,
    toMountPoint: jest.fn(),
  };
});

describe('useCreateAdhocDataView', () => {
  beforeEach(() => {});

  afterEach(() => {});

  it('should create data view successfully with given patterns', async () => {
    const { result } = renderHook(() => useCreateAdhocDataView(jest.fn()));

    const mockDataViews = mockedUseKibana.services.dataViews;

    await act(async () => {
      await result.current.createAdhocDataView(['pattern-1-*', 'pattern-2-*']);
    });

    expect(mockDataViews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'pattern-1-*,pattern-2-*',
        id: 'adhoc_sourcerer_pattern-1-*,pattern-2-*',
      })
    );
  });

  it('should add error on failure', async () => {
    const onResolveErrorManually = jest.fn();
    const error = new Error('error');
    const mockDataViews = mockedUseKibana.services.dataViews;

    mockDataViews.create.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useCreateAdhocDataView(onResolveErrorManually));

    await act(async () => {
      const dataView = await result.current.createAdhocDataView(['pattern-1-*']);
      expect(dataView).toBeNull();
    });

    expect(mockAddError).toHaveBeenCalledWith(error, {
      title: i18n.FAILURE_TOAST_TITLE,
      toastMessage: expect.anything(),
    });
  });
});
