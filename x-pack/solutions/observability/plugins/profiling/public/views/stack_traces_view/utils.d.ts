import type { TypeOf } from '@kbn/typed-react-router-config';
import { TopNType } from '@kbn/profiling-utils';
import type { ProfilingRoutes } from '../../routing';
export declare function getTracesViewRouteParams({ query, topNType, category, }: {
    query: TypeOf<ProfilingRoutes, '/stacktraces/{topNType}'>['query'];
    topNType: TopNType;
    category: string;
}): {
    path: {
        topNType: TopNType;
    };
    query: {
        kuery: string;
        rangeFrom: string;
        rangeTo: string;
        displayAs: import("@kbn/profiling-utils").StackTracesDisplayOption;
        limit: number;
    };
};
