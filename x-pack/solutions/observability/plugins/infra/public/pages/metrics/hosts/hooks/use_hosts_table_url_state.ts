/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { pipe } from 'fp-ts/pipeable';
import { fold } from 'fp-ts/Either';
import { constant, identity } from 'fp-ts/function';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useCallback, useEffect } from 'react';
import { useUrlState } from '@kbn/observability-shared-plugin/public';
import { DEFAULT_PAGE_SIZE, LOCAL_STORAGE_PAGE_SIZE_KEY } from '../constants';

export const GET_DEFAULT_TABLE_PROPERTIES: TableProperties = {
  detailsItemId: null,
  sorting: {
    direction: 'desc',
    field: 'alertsCount',
  },
  pagination: {
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  },
};

const HOST_TABLE_PROPERTIES_URL_STATE_KEY = 'tableProperties';

const reducer = (prevState: TableProperties, params: Payload) => {
  const payload = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined));

  return {
    ...prevState,
    ...payload,
  };
};

export const useHostsTableUrlState = (): [TableProperties, TablePropertiesUpdater] => {
  const [localStoragePageSize, setLocalStoragePageSize] = useLocalStorage<number>(
    LOCAL_STORAGE_PAGE_SIZE_KEY,
    DEFAULT_PAGE_SIZE
  );

  const [urlState, setUrlState] = useUrlState<TableProperties>({
    defaultState: {
      ...GET_DEFAULT_TABLE_PROPERTIES,
      pagination: {
        ...GET_DEFAULT_TABLE_PROPERTIES.pagination,
        pageSize: localStoragePageSize,
      },
    },

    decodeUrlState,
    encodeUrlState,
    urlStateKey: HOST_TABLE_PROPERTIES_URL_STATE_KEY,
  });

  // P10 — partial-merge setter. The previous implementation used a private
  // `useReducer` to materialise table state into local React state and then
  // mirror it back to the URL via a render-time `setUrlState(...)`. That
  // shape only works for a *single* consumer: when more than one component
  // calls this hook (`useHostsView` reads sorting/pagination for the Phase A
  // / Phase B fetchers; `useHostsTable` reads & writes the same fields for
  // the EUI table), each consumer ends up with its own `useReducer`
  // instance. As soon as one consumer dispatches a write, its reducer
  // diverges from the URL — and the *other* consumer's reducer (still on
  // the previous value) immediately writes its stale state back to the URL
  // on the next render, kicking off an infinite ping-pong (observed as a
  // browser freeze when clicking the CPU column header).
  //
  // The URL is already the single source of truth — `useUrlState`'s setter
  // accepts a function that receives the latest decoded URL state, so we
  // can express the same partial-merge semantics without any local React
  // state at all. Every consumer reads from the same URL and writes through
  // the same merge function; no divergence is possible.
  //
  // Important quirk of `useUrlState`: when the URL has no `tableProperties`
  // query parameter yet, the functional setter receives `{}` (an empty
  // object literal) — *not* the hook's `defaultState`. A naive `prev ??
  // defaults` doesn't catch that because `{}` isn't nullish, so the first
  // write would emit only the patched field to the URL, the strict io-ts
  // decoder would reject the incomplete shape, and subsequent reads would
  // silently fall back to `defaultState` (the user sees sorting / pagination
  // never update). We seed the reducer with a full default state merged
  // over `prev` so the URL always carries the complete `TableState` shape.
  const setProperties: TablePropertiesUpdater = useCallback(
    (patch) => {
      setUrlState((prev) => {
        const seed: TableProperties = {
          ...GET_DEFAULT_TABLE_PROPERTIES,
          ...(prev ?? {}),
          // `pagination` deserves its own pick because the localStorage
          // page size only seeds the *first* write (when `prev.pagination`
          // is missing); once the URL carries a real pagination block we
          // must preserve it verbatim so the user's page index survives.
          pagination: prev?.pagination ?? {
            ...GET_DEFAULT_TABLE_PROPERTIES.pagination,
            pageSize: localStoragePageSize ?? DEFAULT_PAGE_SIZE,
          },
        };
        return reducer(seed, patch);
      });
    },
    [setUrlState, localStoragePageSize]
  );

  // Keep `localStorage` in sync with the URL's page size so a fresh tab
  // opens at the user's last choice. Side-effect lives in `useEffect`
  // (not in render) for the same reason as above — running it during render
  // is fine for a single consumer but turns into duplicate writes when
  // multiple components share this hook.
  useEffect(() => {
    if (localStoragePageSize !== urlState.pagination.pageSize) {
      setLocalStoragePageSize(urlState.pagination.pageSize);
    }
  }, [urlState.pagination.pageSize, localStoragePageSize, setLocalStoragePageSize]);

  return [urlState, setProperties];
};

const PaginationRT = rt.partial({ pageIndex: rt.number, pageSize: rt.number });
const SortingRT = rt.intersection([
  rt.type({
    field: rt.string,
  }),
  rt.partial({ direction: rt.union([rt.literal('asc'), rt.literal('desc')]) }),
]);

const TableStateRT = rt.type({
  detailsItemId: rt.union([rt.string, rt.null]),
  pagination: PaginationRT,
  sorting: SortingRT,
});

export type TableState = rt.TypeOf<typeof TableStateRT>;
export type Payload = Partial<TableState>;
export type TablePropertiesUpdater = (params: Payload) => void;

export type Sorting = rt.TypeOf<typeof SortingRT>;
type TableProperties = rt.TypeOf<typeof TableStateRT>;

const encodeUrlState = TableStateRT.encode;
const decodeUrlState = (value: unknown) => {
  return pipe(TableStateRT.decode(value), fold(constant(undefined), identity));
};
