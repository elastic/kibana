import type { DataHandler, ObservabilityFetchDataPlugins } from '../../typings/fetch_overview_data';
export declare function registerDataHandler<T extends ObservabilityFetchDataPlugins>({ appName, fetchData, hasData, }: {
    appName: T;
} & DataHandler<T>): void;
export declare function unregisterDataHandler<T extends ObservabilityFetchDataPlugins>({ appName, }: {
    appName: T;
}): void;
export declare function getDataHandler<T extends ObservabilityFetchDataPlugins>(appName: T): DataHandler<T> | undefined;
