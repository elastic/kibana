/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { useSearch, useSearchStrategy } from '.';

import { renderHook, act } from '@testing-library/react';

import { useObservable } from '@kbn/securitysolution-hook-utils';
import type {
  FactoryQueryTypes,
  StrategyRequestInputType,
} from '../../../../common/search_strategy';
import { of, throwError } from 'rxjs';

vi.mock('@kbn/securitysolution-hook-utils');

const mockAddToastError = vi.fn();
const mockAddToastWarning = vi.fn();
vi.mock('../../hooks/use_app_toasts', () => {
  const mocked = {
    useAppToasts: vi.fn(() => ({
      addError: mockAddToastError,
      addWarning: mockAddToastWarning,
    })),
  };
  return { ...mocked, default: mocked };
});

const mockSearch = vi.fn(() =>
  // default to completed response
  of({
    rawResponse: {},
    isPartial: false,
    isRunning: false,
  })
);
vi.mock('../../lib/kibana', async () => {
  const original = await vi.importActual('../../lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        data: {
          search: {
            search: mockSearch,
          },
        },
      },
    }),
  };
});

const mockEndTracking = vi.fn();
const mockStartTracking = vi.fn(() => ({
  endTracking: mockEndTracking,
}));
vi.mock('../../lib/apm/use_track_http_request', () => {
  const mocked = {
    useTrackHttpRequest: () => ({ startTracking: mockStartTracking }),
  };
  return { ...mocked, default: mocked };
});

const mockAbortController = new AbortController();
mockAbortController.abort = vi.fn();

const useObservableHookResult = {
  start: vi.fn(),
  error: null,
  result: null,
  loading: false,
};

const factoryQueryType = 'testFactoryQueryType' as FactoryQueryTypes;
const userSearchStrategyProps = {
  factoryQueryType,
  initialResult: {},
  errorMessage: 'testErrorMessage',
};

const request = {
  fake: 'request',
  search: 'parameters',
} as unknown as StrategyRequestInputType<FactoryQueryTypes>;

describe('useSearchStrategy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'AbortController').mockRestore();
  });

  it("returns the provided initial result while the query hasn't returned data", () => {
    const initialResult = {};
    (useObservable as Mock).mockReturnValue(useObservableHookResult);

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({ ...userSearchStrategyProps, initialResult })
    );

    expect(result.current.result).toEqual(initialResult);
  });

  it('calls start with the given request', () => {
    const start = vi.fn();

    (useObservable as Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);
    expect(start).toHaveBeenCalledWith(expect.objectContaining({ request }));
  });

  it('returns inspect', () => {
    const dsl = 'testDsl';

    (useObservable as Mock).mockReturnValue({
      ...useObservableHookResult,
      result: {
        rawResponse: {},
        inspect: {
          dsl,
        },
      },
    });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    expect(result.current.inspect).toEqual({
      dsl,
      response: ['{}'],
    });
  });

  it('shows toast error when the API returns error', () => {
    const error = 'test error';
    const errorMessage = 'error message title';
    (useObservable as Mock).mockReturnValue({
      ...useObservableHookResult,
      error,
    });

    renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({ ...userSearchStrategyProps, errorMessage })
    );

    expect(mockAddToastError).toHaveBeenCalledWith(error, { title: errorMessage });
  });

  it('does not show toast error if showErrorToast = false', () => {
    const error = 'test error';
    const errorMessage = 'error message title';
    (useObservable as Mock).mockReturnValue({
      ...useObservableHookResult,
      error,
    });

    renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>({
        ...userSearchStrategyProps,
        showErrorToast: false,
        errorMessage,
      })
    );

    expect(mockAddToastError).not.toHaveBeenCalled();
  });

  it('start should be called when search is called ', () => {
    const start = vi.fn();

    (useObservable as Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);

    expect(start).toHaveBeenCalled();
  });

  it('refetch should execute the previous search again with the same params', async () => {
    const start = vi.fn();

    (useObservable as Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result, rerender } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);

    rerender();

    result.current.refetch();

    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[0]).toEqual(start.mock.calls[1]);
  });

  it('aborts previous search when a subsequent search is triggered', async () => {
    vi.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);

    (useObservable as Mock).mockReturnValue(useObservableHookResult);

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);
    result.current.search(request);

    expect(mockAbortController.abort).toHaveBeenCalledTimes(2);
  });

  it('aborts search when component unmounts', async () => {
    vi.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);

    (useObservable as Mock).mockReturnValue(useObservableHookResult);

    const { result, unmount } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);
    unmount();

    expect(mockAbortController.abort).toHaveBeenCalledTimes(2);
  });

  it('calls start with the AbortController signal', () => {
    vi.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);
    const start = vi.fn();

    (useObservable as Mock).mockReturnValue({ ...useObservableHookResult, start });

    const { result } = renderHook(() =>
      useSearchStrategy<FactoryQueryTypes>(userSearchStrategyProps)
    );

    result.current.search(request);

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ abortSignal: mockAbortController.signal })
    );
  });

  it('abort = true will cancel any running request', () => {
    vi.spyOn(window, 'AbortController').mockReturnValue(mockAbortController);
    const localProps = { ...userSearchStrategyProps, abort: false };

    const { rerender } = renderHook(() => useSearchStrategy<FactoryQueryTypes>(localProps));
    localProps.abort = true;
    act(() => rerender());

    expect(mockAbortController.abort).toHaveBeenCalledTimes(1);
  });

  describe('search function', () => {
    it('should track successful search result', () => {
      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: new AbortController().signal }).subscribe();

      expect(mockStartTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledWith('success');
    });

    it('should handle search error', () => {
      const error = 'simulated search error';
      mockSearch.mockImplementationOnce(() => {
        return throwError(() => Error(error));
      });

      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: new AbortController().signal }).subscribe();

      expect(mockStartTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledWith('error');
    });

    it('should track error search result', () => {
      mockSearch.mockImplementationOnce(() => {
        return throwError(() => Error('fake server error'));
      });

      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: new AbortController().signal }).subscribe();

      expect(mockStartTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledWith('error');
    });

    it('should track aborted search result', () => {
      const abortController = new AbortController();
      mockSearch.mockImplementationOnce(() => {
        abortController.abort();
        return throwError(() => Error('fake aborted'));
      });

      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: abortController.signal }).subscribe();

      expect(mockStartTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledTimes(1);
      expect(mockEndTracking).toHaveBeenCalledWith('aborted');
    });

    it('forwards the executionContext option to data.search.search when provided', () => {
      const executionContext = {
        child: { type: 'security_solution', name: 'test_page', id: 'test_panel' },
      };

      const { result } = renderHook(() =>
        useSearch<FactoryQueryTypes>(factoryQueryType, executionContext)
      );
      result.current({ request, abortSignal: new AbortController().signal }).subscribe();

      expect(mockSearch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ executionContext })
      );
    });

    it('omits the executionContext option when not provided (undefined is still forwarded)', () => {
      const { result } = renderHook(() => useSearch<FactoryQueryTypes>(factoryQueryType));
      result.current({ request, abortSignal: new AbortController().signal }).subscribe();

      expect(mockSearch).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ executionContext: undefined })
      );
    });
  });
});
