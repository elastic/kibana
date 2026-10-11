/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { mockBrowserFields, mockIndexFields, mockIndexFieldsByName } from './mock';
import * as indexUtils from '.';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_app_toasts');

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createDataView = (title: string) => ({
  toSpec: () => ({ title }),
  getIndexPattern: () => title,
  fields: [],
});

describe('source/index.tsx', () => {
  describe('getAllBrowserFields', () => {
    it('should return the expected browser fields list', () => {
      expect(indexUtils.getAllBrowserFields(mockBrowserFields)).toEqual(mockIndexFields);
    });
  });

  describe('getAllFieldsByName', () => {
    it('should return the expected browser fields list', () => {
      expect(indexUtils.getAllFieldsByName(mockBrowserFields)).toEqual(mockIndexFieldsByName);
    });
  });

  describe('useFetchIndex', () => {
    const mockCreate = jest.fn();
    const mockAddError = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      (useKibana as jest.Mock).mockReturnValue({
        services: { data: { dataViews: { create: mockCreate } } },
      });
      (useAppToasts as jest.Mock).mockReturnValue({ addError: mockAddError });
    });

    const renderUseFetchIndex = async () => {
      const first = createDeferred<ReturnType<typeof createDataView>>();
      const second = createDeferred<ReturnType<typeof createDataView>>();
      mockCreate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const hook = renderHook(({ indexNames }) => indexUtils.useFetchIndex(indexNames), {
        initialProps: { indexNames: ['older-*'] },
      });
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
      hook.rerender({ indexNames: ['newer-*'] });
      await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(2));

      return { hook, first, second };
    };

    it('keeps the result of the newest request when an older response arrives last', async () => {
      const { hook, first, second } = await renderUseFetchIndex();

      await act(async () => {
        second.resolve(createDataView('newer-*'));
      });
      await act(async () => {
        first.resolve(createDataView('older-*'));
      });

      const [loading, { indexes, indexPatterns }] = hook.result.current;
      expect(loading).toBe(false);
      expect(indexes).toEqual(['newer-*']);
      expect(indexPatterns.title).toBe('newer-*');
    });

    it('stays loading until the newest request resolves', async () => {
      const { hook, first, second } = await renderUseFetchIndex();

      await act(async () => {
        first.resolve(createDataView('older-*'));
      });
      expect(hook.result.current[0]).toBe(true);

      await act(async () => {
        second.resolve(createDataView('newer-*'));
      });
      expect(hook.result.current[0]).toBe(false);
      expect(hook.result.current[1].indexes).toEqual(['newer-*']);
    });

    it('ignores the error of an older request that fails last', async () => {
      const { hook, first, second } = await renderUseFetchIndex();

      await act(async () => {
        second.resolve(createDataView('newer-*'));
      });
      await act(async () => {
        first.reject(new Error('older request failed'));
      });

      expect(mockAddError).not.toHaveBeenCalled();
      expect(hook.result.current[1].indexes).toEqual(['newer-*']);
    });

    it('reports the error of the newest request', async () => {
      const { hook, first, second } = await renderUseFetchIndex();

      await act(async () => {
        first.resolve(createDataView('older-*'));
      });
      await act(async () => {
        second.reject(new Error('newer request failed'));
      });

      expect(mockAddError).toHaveBeenCalledWith('newer request failed', expect.anything());
      expect(hook.result.current[0]).toBe(false);
    });
  });
});
