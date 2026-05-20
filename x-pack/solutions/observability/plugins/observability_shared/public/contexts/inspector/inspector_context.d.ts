import type { ReactNode } from 'react';
import React from 'react';
import type { Request } from '@kbn/inspector-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { FetcherResult } from '../../hooks/use_fetcher';
type InspectResponse = Request[];
export interface InspectorContextValue {
    addInspectorRequest: (result: FetcherResult<any>) => void;
    inspectorAdapters: {
        requests: RequestAdapter;
    };
}
export declare const InspectorContext: React.Context<InspectorContextValue>;
export interface InspectorRequestProps {
    mainStatisticsData?: {
        _inspect?: InspectResponse;
    };
    _inspect?: InspectResponse;
}
export type AddInspectorRequest = (result: FetcherResult<InspectorRequestProps>) => void;
export declare function InspectorContextProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
export {};
