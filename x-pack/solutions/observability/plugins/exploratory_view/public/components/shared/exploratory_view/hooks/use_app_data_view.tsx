/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, Context, useState, useCallback, useMemo } from 'react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DataViewInsufficientAccessError } from '@kbn/data-views-plugin/common';
import { AppDataType } from '../types';
import { ExploratoryViewPublicPluginsStart } from '../../../../plugin';
import {
  getDataTypeIndices,
  ObservabilityDataViews,
} from '../../../../utils/observability_data_views';

export interface DataViewContext {
  loading: boolean;
  dataViews: DataViewState;
  dataViewErrors: DataViewErrors;
  hasAppData: HasAppDataState;
  loadDataView: (params: { dataType: AppDataType }) => void;
}

export const DataViewContext = createContext<Partial<DataViewContext>>({});

interface ProviderProps {
  children: JSX.Element;
}

type HasAppDataState = Record<AppDataType, boolean | undefined>;
export type DataViewState = Record<AppDataType, DataView>;
export type DataViewErrors = Record<AppDataType, IHttpFetchError<any>>;
type LoadingState = Record<AppDataType, boolean>;

export function DataViewContextProvider({ children }: ProviderProps) {
  const [loading, setLoading] = useState<LoadingState>({} as LoadingState);
  const [dataViews, setDataViews] = useState<DataViewState>({} as DataViewState);
  const [dataViewErrors, setDataViewErrors] = useState<DataViewErrors>({} as DataViewErrors);
  const [hasAppData, setHasAppData] = useState<HasAppDataState>({} as HasAppDataState);

  const {
    services: { dataViews: dataViewsService },
  } = useKibana<ExploratoryViewPublicPluginsStart>();

  const loadDataView: DataViewContext['loadDataView'] = useCallback(
    async ({ dataType }) => {
      if (typeof hasAppData[dataType] === 'undefined' && !loading[dataType]) {
        setLoading((prevState) => ({ ...prevState, [dataType]: true }));
        try {
          const { indices, hasData } = await getDataTypeIndices(dataType);

          setHasAppData((prevState) => ({ ...prevState, [dataType]: hasData }));

          if (hasData && indices) {
            const obsvDataV = new ObservabilityDataViews(dataViewsService, true);
            const dataV = await obsvDataV.getDataView(dataType, indices);

            setDataViews((prevState) => ({ ...prevState, [dataType]: dataV }));
          }
          setLoading((prevState) => ({ ...prevState, [dataType]: false }));
        } catch (e) {
          if (
            e instanceof DataViewInsufficientAccessError ||
            (e as IHttpFetchError).body === 'Forbidden'
          ) {
            setDataViewErrors((prevState) => ({ ...prevState, [dataType]: e }));
          }
          setLoading((prevState) => ({ ...prevState, [dataType]: false }));
        }
      }
    },
    [dataViewsService, hasAppData, loading]
  );

  return (
    <DataViewContext.Provider
      value={{
        hasAppData,
        dataViews,
        loadDataView,
        dataViewErrors,
        loading: !!Object.values(loading).find((loadingT) => loadingT),
      }}
    >
      {children}
    </DataViewContext.Provider>
  );
}

export const useAppDataViewContext = (dataType?: AppDataType) => {
  const { loading, hasAppData, loadDataView, dataViews, dataViewErrors } = useContext(
    DataViewContext as unknown as Context<DataViewContext>
  );

  if (dataType && !dataViews?.[dataType] && !loading) {
    loadDataView({ dataType });
  }

  return useMemo(() => {
    return {
      hasAppData,
      loading,
      dataViews,
      dataViewErrors,
      dataView: dataType ? dataViews?.[dataType] : undefined,
      hasData: dataType ? hasAppData?.[dataType] : undefined,
      loadDataView,
    };
  }, [dataType, hasAppData, dataViewErrors, dataViews, loadDataView, loading]);
};
