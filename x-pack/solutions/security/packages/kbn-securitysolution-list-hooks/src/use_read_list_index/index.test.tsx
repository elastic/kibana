/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { waitFor, renderHook } from '@testing-library/react';

import type { SecurityAppError } from '@kbn/securitysolution-t-grid';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import * as Api from '@kbn/securitysolution-list-api';
import { getListIndexExistSchemaMock } from '../mocks/response/read_list_index_schema.mock';
import { useReadListIndex } from '.';

jest.mock('@kbn/securitysolution-list-api');

const customQueryProviderWrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const mockLogger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() };
  const queryClient = new QueryClient({ logger: mockLogger });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('useReadListIndex', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
  });

  describe('when both indices exist', () => {
    beforeEach(() => {
      (Api.readListIndex as jest.Mock).mockResolvedValue(getListIndexExistSchemaMock());
    });

    it('returns a response indicating both indices exist', async () => {
      const { result } = renderHook(
        () =>
          useReadListIndex({
            http: httpMock,
            isEnabled: true,
          }),
        { wrapper: customQueryProviderWrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            loading: false,
            result: { list_index: true, list_item_index: true },
            error: null,
          })
        );
      });
    });
  });

  describe('error conditions', () => {
    let mockOnError: jest.Mock;

    beforeEach(() => {
      mockOnError = jest.fn();
    });

    it('does not call onError for an expected 404 response', async () => {
      const notFoundError: SecurityAppError = {
        message: 'Error',
        name: 'Error',
        body: {
          message: 'data stream .lists-default does not exist',
          status_code: 404,
        },
      };
      (Api.readListIndex as jest.Mock).mockRejectedValue(notFoundError);

      const { result } = renderHook(
        () =>
          useReadListIndex({
            http: httpMock,
            isEnabled: true,
            onError: mockOnError,
          }),
        { wrapper: customQueryProviderWrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            loading: false,
            error: null,
          })
        );
      });

      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('returns the appropriate response when neither list index exists', async () => {
      const neitherFoundError: SecurityAppError = {
        message: 'Error',
        name: 'Error',
        body: {
          message: 'data stream .lists-default and data stream .items-default does not exist',
          status_code: 404,
        },
      };
      (Api.readListIndex as jest.Mock).mockRejectedValue(neitherFoundError);

      const { result } = renderHook(
        () =>
          useReadListIndex({
            http: httpMock,
            isEnabled: true,
          }),
        { wrapper: customQueryProviderWrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            loading: false,
            result: { list_index: false, list_item_index: false },
            error: null,
          })
        );
      });
    });

    it('returns the appropriate response when only the lists index exists', async () => {
      const neitherFoundError: SecurityAppError = {
        message: 'Error',
        name: 'Error',
        body: {
          message: 'data stream .items-default does not exist',
          status_code: 404,
        },
      };
      (Api.readListIndex as jest.Mock).mockRejectedValue(neitherFoundError);

      const { result } = renderHook(
        () =>
          useReadListIndex({
            http: httpMock,
            isEnabled: true,
          }),
        { wrapper: customQueryProviderWrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            loading: false,
            result: { list_index: true, list_item_index: false },
            error: null,
          })
        );
      });
    });

    it('returns the appropriate response when only the items index exists', async () => {
      const neitherFoundError: SecurityAppError = {
        message: 'Error',
        name: 'Error',
        body: {
          message: 'data stream .lists-default does not exist',
          status_code: 404,
        },
      };
      (Api.readListIndex as jest.Mock).mockRejectedValue(neitherFoundError);

      const { result } = renderHook(
        () =>
          useReadListIndex({
            http: httpMock,
            isEnabled: true,
          }),
        { wrapper: customQueryProviderWrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            loading: false,
            result: { list_index: false, list_item_index: true },
            error: null,
          })
        );
      });
    });

    it('calls onError with and returns a generic error', async () => {
      const genericError = new Error('Generic error');
      (Api.readListIndex as jest.Mock).mockRejectedValue(genericError);

      const { result } = renderHook(
        () =>
          useReadListIndex({
            http: httpMock,
            isEnabled: true,
            onError: mockOnError,
          }),
        { wrapper: customQueryProviderWrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            loading: false,
            result: undefined,
            error: genericError,
          })
        );
      });
      expect(mockOnError).toHaveBeenCalledWith(genericError);
    });

    it('calls onError with and returns a 404 error that does not mention an index not being found', async () => {
      const genericNotFoundError: SecurityAppError = {
        message: 'Error',
        name: 'Error',
        body: {
          message: 'Not found',
          status_code: 404,
        },
      };
      (Api.readListIndex as jest.Mock).mockRejectedValue(genericNotFoundError);

      const { result } = renderHook(
        () =>
          useReadListIndex({
            http: httpMock,
            isEnabled: true,
            onError: mockOnError,
          }),
        { wrapper: customQueryProviderWrapper }
      );

      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            loading: false,
            result: undefined,
            error: genericNotFoundError,
          })
        );
      });
      expect(mockOnError).toHaveBeenCalledWith(genericNotFoundError);
    });
  });
});
