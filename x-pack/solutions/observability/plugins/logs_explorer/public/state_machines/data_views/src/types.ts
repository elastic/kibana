/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DoneInvokeEvent } from 'xstate';
import { DataViewDescriptor } from '../../../../common/data_views/models/data_view_descriptor';
import type { IHashedCache } from '../../../../common/hashed_cache';
import { SortOrder } from '../../../../common/latest';

export interface DataViewsSearchParams {
  name?: string;
  sortOrder?: SortOrder;
}

export interface DataViewsFilterParams {
  dataType?: Extract<DataViewDescriptor['dataType'], 'logs' | undefined>; // only allow logs data type or no filter for now
}

export interface WithCache {
  cache: IHashedCache<WithSearch & WithFilter, DataViewDescriptor[]>;
}

export interface WithSearch {
  search: DataViewsSearchParams;
}

export interface WithFilter {
  filter: DataViewsFilterParams;
}

export interface WithDataViews {
  dataViewsSource: DataViewDescriptor[];
  dataViews: DataViewDescriptor[];
}

export interface WithNullishDataViews {
  dataViewsSource: null;
  dataViews: null;
}

export interface WithError {
  error: Error;
}

export interface WithNullishError {
  error: null;
}

export type DefaultDataViewsContext = WithCache &
  WithNullishDataViews &
  WithSearch &
  WithFilter &
  WithNullishError;

type LoadingDataViewsContext = DefaultDataViewsContext;

type LoadedDataViewsContext = WithCache &
  WithDataViews &
  WithSearch &
  WithFilter &
  WithNullishError;

type LoadingFailedDataViewsContext = WithCache &
  WithNullishDataViews &
  WithSearch &
  WithFilter &
  WithError;

export type DataViewsTypestate =
  | {
      value: 'uninitialized';
      context: DefaultDataViewsContext;
    }
  | {
      value: 'loading';
      context: LoadingDataViewsContext;
    }
  | {
      value: 'loaded';
      context: LoadedDataViewsContext;
    }
  | {
      value: 'loaded.idle';
      context: LoadedDataViewsContext;
    }
  | {
      value: 'loaded.debounceSearchingDataViews';
      context: LoadedDataViewsContext;
    }
  | {
      value: 'loadingFailed';
      context: LoadingFailedDataViewsContext;
    };

export type DataViewsContext = DataViewsTypestate['context'];

export type DataViewsEvent =
  | {
      type: 'LOAD_DATA_VIEWS';
    }
  | {
      type: 'RELOAD_DATA_VIEWS';
    }
  | {
      type: 'SEARCH_DATA_VIEWS';
      search: DataViewsSearchParams;
    }
  | {
      type: 'FILTER_DATA_VIEWS';
      filter: DataViewsFilterParams;
    }
  | {
      type: 'SORT_DATA_VIEWS';
      search: DataViewsSearchParams;
    }
  | DoneInvokeEvent<DataViewDescriptor[] | Error>;
