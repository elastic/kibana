/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useImportArtifactList } from './use_import_artifact_list';
import type { HttpSetup } from '@kbn/core/public';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import {
  getFakeListId,
  getFakeListDefinition,
  getFakeHttpService,
  renderMutation,
} from '../test_utils';
import type { ImportExceptionsResponseSchema } from '@kbn/securitysolution-io-ts-list-types';

describe('Import artifact list hook', () => {
  let result: ReturnType<typeof useImportArtifactList>;

  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let instance: ExceptionsListApiClient;

  beforeEach(() => {
    fakeHttpServices = getFakeHttpService();
    instance = new ExceptionsListApiClient(
      fakeHttpServices,
      getFakeListId(),
      getFakeListDefinition()
    );
  });

  it('import an artifact list', async () => {
    const apiResponse: ImportExceptionsResponseSchema = {
      success: true,
      success_count: 1,
      success_exception_lists: true,
      success_count_exception_lists: 1,
      success_exception_list_items: true,
      success_count_exception_list_items: 0,
      errors: [],
    };

    fakeHttpServices.post.mockClear();
    fakeHttpServices.post.mockResolvedValueOnce(apiResponse);
    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useImportArtifactList(instance, {
        retry: false,
        onSuccess: onSuccessMock,
      })
    );

    expect(fakeHttpServices.post).toHaveBeenCalledTimes(0);

    const mockFile = new File(['test content'], 'test.ndjson', { type: 'application/ndjson' });

    const res = await result.mutateAsync({ file: mockFile });

    expect(res).toBe(apiResponse);
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
    expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
    expect(fakeHttpServices.post).toHaveBeenCalledWith(
      '/api/exception_lists/_import',
      expect.objectContaining({
        version: '2023-10-31',
        headers: { 'Content-Type': undefined },
        body: expect.any(FormData),
        query: {
          overwrite: false,
        },
      })
    );
  });

  it('throw when importing an artifact list', async () => {
    const expectedError = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.post.mockClear();
    fakeHttpServices.post.mockRejectedValue(expectedError);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useImportArtifactList(instance, {
        onError: onErrorMock,
        retry: false,
      })
    );

    const mockFile = new File(['test content'], 'test.ndjson', { type: 'application/ndjson' });

    try {
      await result.mutateAsync({ file: mockFile });
    } catch (error) {
      expect(error).toBe(expectedError);
      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(1);
    }
  });
});
