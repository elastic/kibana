import type { TypeOf } from '@kbn/typed-react-router-config';
import type { StatefulProfilingRouter } from '../../hooks/use_profiling_router';
import type { ProfilingRoutes } from '../../routing';
export declare function getStackTracesTabs({ path, query, profilingRouter, }: TypeOf<ProfilingRoutes, '/stacktraces/{topNType}'> & {
    profilingRouter: StatefulProfilingRouter;
}): {
    label: string;
    isSelected: boolean;
    href: string;
}[];
