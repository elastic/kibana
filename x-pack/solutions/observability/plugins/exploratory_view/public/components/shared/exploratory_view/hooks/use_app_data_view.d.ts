import type { Context } from 'react';
import React from 'react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { AppDataType } from '../types';
export interface DataViewContext {
    loading: boolean;
    dataViews: DataViewState;
    dataViewErrors: DataViewErrors;
    hasAppData: HasAppDataState;
    loadDataView: (params: {
        dataType: AppDataType;
    }) => void;
}
export declare const DataViewContext: Context<Partial<DataViewContext>>;
interface ProviderProps {
    children: JSX.Element;
}
type HasAppDataState = Record<AppDataType, boolean | undefined>;
export type DataViewState = Record<AppDataType, DataView>;
export type DataViewErrors = Record<AppDataType, IHttpFetchError<any>>;
export declare function DataViewContextProvider({ children }: ProviderProps): React.JSX.Element;
export declare const useAppDataViewContext: (dataType?: AppDataType) => {
    hasAppData: HasAppDataState;
    loading: boolean;
    dataViews: DataViewState;
    dataViewErrors: DataViewErrors;
    dataView: DataView | undefined;
    hasData: boolean | undefined;
    loadDataView: (params: {
        dataType: AppDataType;
    }) => void;
};
export {};
