/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook, act } from '@testing-library/react';

import { useFindLists } from '.';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import * as Api from '@kbn/securitysolution-list-api';

import { getFoundListSchemaMock } from '../mocks/response/found_list_schema.mock';

jest.mock('@kbn/securitysolution-list-api');

describe('useFindLists', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.findLists as jest.Mock).mockResolvedValue(getFoundListSchemaMock());
  });

  it('invokes Api.findLists', async () => {
    const { result } = renderHook(() => useFindLists());
    act(() => {
      result.current.start({ http: httpMock, pageIndex: 1, pageSize: 10 });
    });
    await waitFor(() =>
      expect(Api.findLists).toHaveBeenCalledWith(
        expect.objectContaining({ http: httpMock, pageIndex: 1, pageSize: 10 })
      )
    );
  });
});
