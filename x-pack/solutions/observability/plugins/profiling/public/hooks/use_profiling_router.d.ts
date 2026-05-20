import type { PathsOf, TypeOf, TypeAsArgs } from '@kbn/typed-react-router-config';
import type { ProfilingRouter, ProfilingRoutes } from '../routing';
export interface StatefulProfilingRouter extends ProfilingRouter {
    push<T extends PathsOf<ProfilingRoutes>>(path: T, ...params: TypeAsArgs<TypeOf<ProfilingRoutes, T>>): void;
    replace<T extends PathsOf<ProfilingRoutes>>(path: T, ...params: TypeAsArgs<TypeOf<ProfilingRoutes, T>>): void;
}
export declare function useProfilingRouter(): StatefulProfilingRouter;
