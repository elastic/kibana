import type * as t from 'io-ts';
import React from 'react';
import type { StartServices } from '../application';
export type RouteParams<T extends keyof typeof routes> = DecodeParams<(typeof routes)[T]['params']>;
type DecodeParams<TParams extends Params | undefined> = {
    [key in keyof TParams]: TParams[key] extends t.Any ? t.TypeOf<TParams[key]> : never;
};
export interface Params {
    query?: t.HasProps;
    path?: t.HasProps;
}
export declare const routes: {
    '/': {
        handler: ({ startServices }: {
            startServices: StartServices;
        }) => React.JSX.Element;
        params: {
            query: t.PartialC<{
                rangeFrom: t.StringC;
                rangeTo: t.StringC;
                refreshPaused: t.Type<boolean, string, unknown>;
                refreshInterval: t.Type<number, string, unknown>;
            }>;
        };
        exact: boolean;
    };
};
export {};
