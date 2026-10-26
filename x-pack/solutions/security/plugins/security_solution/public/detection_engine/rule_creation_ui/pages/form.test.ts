/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataSourceType } from '../../common/types';
import { useKibana } from '../../../common/lib/kibana';
import { useFetchIndex } from '../../../common/containers/source';
import { useRuleIndexPattern } from './form';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/containers/source');

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  const deferred = {} as Deferred<T>;
  deferred.promise = new Promise<T>((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

const asDataView = (id: string): DataView => ({ id, title: `${id}-title` } as unknown as DataView);

describe('useRuleIndexPattern', () => {
  const getDataView = jest.fn();
  const addDanger = jest.fn();
  // Stable references, like the real `useFetchIndex` state between renders.
  const fetchedIndexPatterns = { fields: [], title: '' };
  const fetchIndexState = { browserFields: {}, indexPatterns: fetchedIndexPatterns };

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        data: { dataViews: { get: getDataView } },
        notifications: { toasts: { addDanger } },
      },
    });
    (useFetchIndex as jest.Mock).mockReturnValue([false, fetchIndexState]);
  });

  describe('when the data source is a data view', () => {
    // `renderHook` flushes effects before returning, so the value of every render is recorded to
    // be able to assert on the very first one, before any effect has run.
    const renderForDataView = (dataViewId: string | undefined) => {
      const settledByRender: boolean[] = [];
      const rendered = renderHook(
        (props: { dataViewId: string | undefined }) => {
          const value = useRuleIndexPattern({
            dataSourceType: DataSourceType.DataView,
            index: [],
            dataViewId: props.dataViewId,
          });
          settledByRender.push(value.isIndexPatternSettled);
          return value;
        },
        { initialProps: { dataViewId } }
      );
      return { ...rendered, settledByRender };
    };

    it('is not settled from the first render until the data view is fetched', async () => {
      const dataView = createDeferred<DataView>();
      getDataView.mockReturnValue(dataView.promise);

      const { result, settledByRender } = renderForDataView('dv-1');

      expect(settledByRender[0]).toBe(false);
      expect(result.current.isIndexPatternSettled).toBe(false);

      await act(async () => {
        dataView.resolve(asDataView('dv-1'));
      });

      await waitFor(() => expect(result.current.isIndexPatternSettled).toBe(true));
      expect(result.current.indexPattern).toEqual(expect.objectContaining({ id: 'dv-1' }));
    });

    it('is settled when fetching the data view fails', async () => {
      const dataView = createDeferred<DataView>();
      getDataView.mockReturnValue(dataView.promise);

      const { result } = renderForDataView('dv-1');

      expect(result.current.isIndexPatternSettled).toBe(false);

      await act(async () => {
        dataView.reject(new Error('conflicting ids'));
      });

      await waitFor(() => expect(result.current.isIndexPatternSettled).toBe(true));
      expect(addDanger).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Error: conflicting ids' })
      );
    });

    it('is not settled again until the newly selected data view is fetched', async () => {
      const first = createDeferred<DataView>();
      const second = createDeferred<DataView>();
      getDataView.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

      const { result, rerender } = renderForDataView('dv-1');
      await act(async () => {
        first.resolve(asDataView('dv-1'));
      });
      await waitFor(() => expect(result.current.isIndexPatternSettled).toBe(true));

      rerender({ dataViewId: 'dv-2' });

      expect(result.current.isIndexPatternSettled).toBe(false);

      await act(async () => {
        second.resolve(asDataView('dv-2'));
      });

      await waitFor(() => expect(result.current.isIndexPatternSettled).toBe(true));
    });

    it('is settled when no data view is selected', () => {
      const { result, settledByRender } = renderForDataView(undefined);

      expect(settledByRender[0]).toBe(true);
      expect(result.current.isIndexPatternSettled).toBe(true);
      expect(getDataView).not.toHaveBeenCalled();
    });
  });

  describe('when the data source is index patterns', () => {
    const renderForIndexPatterns = () =>
      renderHook(() =>
        useRuleIndexPattern({
          dataSourceType: DataSourceType.IndexPatterns,
          index: ['logs-*'],
          dataViewId: undefined,
        })
      );

    it('is not settled while the index fields are loading', () => {
      (useFetchIndex as jest.Mock).mockReturnValue([true, fetchIndexState]);

      const { result } = renderForIndexPatterns();

      expect(result.current.isIndexPatternSettled).toBe(false);
    });

    it('is settled once the index fields are loaded', async () => {
      const { result } = renderForIndexPatterns();

      await waitFor(() => expect(result.current.isIndexPatternSettled).toBe(true));
    });
  });
});
