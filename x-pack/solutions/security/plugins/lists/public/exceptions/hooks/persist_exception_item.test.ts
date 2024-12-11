/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { usePersistExceptionItem } from '@kbn/securitysolution-list-hooks';
import * as api from '@kbn/securitysolution-list-api/src/api';

import { ENTRIES_WITH_IDS } from '../../../common/constants.mock';
import { getCreateExceptionListItemSchemaMock } from '../../../common/schemas/request/create_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../../../common/schemas/request/update_exception_list_item_schema.mock';
import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';

const mockKibanaHttpService = coreMock.createStart().http;

// TODO: Port this test over to packages/kbn-securitysolution-list-hooks/src/use_persist_exception_item/index.test.ts once the other mocks are added to the kbn package system

describe('usePersistExceptionItem', () => {
  let addExceptionListItemSpy: jest.SpyInstance<ReturnType<typeof api.addEndpointExceptionList>>;
  let updateExceptionListItemSpy: jest.SpyInstance<ReturnType<typeof api.updateExceptionListItem>>;
  const onError = jest.fn();

  beforeAll(() => {
    addExceptionListItemSpy = jest.spyOn(api, 'addExceptionListItem');
    updateExceptionListItemSpy = jest.spyOn(api, 'updateExceptionListItem');
  });

  beforeEach(() => {
    addExceptionListItemSpy.mockResolvedValue(getExceptionListItemSchemaMock());
    updateExceptionListItemSpy.mockResolvedValue(getExceptionListItemSchemaMock());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes hook', async () => {
    const { result } = renderHook(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
  });

  test('"isLoading" is "true" when exception item is being saved', async () => {
    const { result } = renderHook(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    await waitFor(() =>
      expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]])
    );

    act(() => {
      result.current[1](getCreateExceptionListItemSchemaMock());
    });

    expect(result.current).toEqual([{ isLoading: true, isSaved: false }, result.current[1]]);

    await waitFor(() => {
      expect(addExceptionListItemSpy).toHaveBeenCalled();
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });
  });

  test('"isSaved" is "true" when exception item saved successfully', async () => {
    const { result } = renderHook(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    act(() => {
      result.current[1](getCreateExceptionListItemSchemaMock());
    });

    await waitFor(() =>
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]])
    );
  });

  test('it invokes "updateExceptionListItem" when payload has "id"', async () => {
    const { result } = renderHook(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    await waitFor(() => new Promise((resolve) => resolve(null)));

    act(() => {
      // NOTE: Take note here passing in an exception item where it's
      // entries have been enriched with ids to ensure that they get stripped
      // before the call goes through
      result.current[1]({ ...getUpdateExceptionListItemSchemaMock(), entries: ENTRIES_WITH_IDS });
    });

    await waitFor(() => {
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });

    expect(addExceptionListItemSpy).not.toHaveBeenCalled();
    expect(updateExceptionListItemSpy).toHaveBeenCalledWith({
      http: mockKibanaHttpService,
      listItem: getUpdateExceptionListItemSchemaMock(),
      signal: expect.any(AbortSignal),
    });
  });

  test('it invokes "addExceptionListItem" when payload does not have "id"', async () => {
    const { result } = renderHook(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    await waitFor(() => new Promise((resolve) => resolve(null)));

    act(() => {
      // NOTE: Take note here passing in an exception item where it's
      // entries have been enriched with ids to ensure that they get stripped
      // before the call goes through
      result.current[1]({ ...getCreateExceptionListItemSchemaMock(), entries: ENTRIES_WITH_IDS });
    });

    await waitFor(() => {
      expect(result.current).toEqual([{ isLoading: false, isSaved: true }, result.current[1]]);
    });

    expect(updateExceptionListItemSpy).not.toHaveBeenCalled();
    expect(addExceptionListItemSpy).toHaveBeenCalledWith({
      http: mockKibanaHttpService,
      listItem: getCreateExceptionListItemSchemaMock(),
      signal: expect.any(AbortSignal),
    });
  });

  test('"onError" callback is invoked and "isSaved" is "false" when api call fails', async () => {
    const error = new Error('persist rule failed');

    addExceptionListItemSpy.mockRejectedValue(error);

    const { result } = renderHook(() =>
      usePersistExceptionItem({ http: mockKibanaHttpService, onError })
    );

    await waitFor(() => new Promise((resolve) => resolve(null)));
    act(() => {
      result.current[1](getCreateExceptionListItemSchemaMock());
    });
    await waitFor(() => {
      expect(result.current).toEqual([{ isLoading: false, isSaved: false }, result.current[1]]);
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});
