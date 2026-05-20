import type { PathsOf, TypeOf } from '@kbn/typed-react-router-config';
import type { ValuesType } from 'utility-types';
import type { ProfilingRoutes } from '../routing';
export declare function useProfilingParams<T extends PathsOf<ProfilingRoutes>>(path: T, ...args: any[]): TypeOf<ProfilingRoutes, T>;
export declare function useAnyOfProfilingParams<TPaths extends Array<PathsOf<ProfilingRoutes>>>(...paths: TPaths): TypeOf<ProfilingRoutes, ValuesType<TPaths>>;
