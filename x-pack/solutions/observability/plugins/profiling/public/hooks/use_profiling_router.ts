/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PathsOf, TypeOf, TypeAsArgs } from '@kbn/typed-react-router-config';
import { useHistory } from 'react-router-dom';
import { useProfilingDependencies } from '../components/contexts/profiling_dependencies/use_profiling_dependencies';
import type { ProfilingRouter, ProfilingRoutes } from '../routing';
import { profilingRouter } from '../routing';
import { useSchemaQueryParam } from './use_schema_query_param';

export interface StatefulProfilingRouter extends ProfilingRouter {
  push<T extends PathsOf<ProfilingRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ProfilingRoutes, T>>
  ): void;
  replace<T extends PathsOf<ProfilingRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<ProfilingRoutes, T>>
  ): void;
}

/**
 * Returns the profiling router. Its navigations keep the current `schema` URL param unless the
 * target params select another one, so the selected schema is never dropped while navigating.
 */
export function useProfilingRouter(): StatefulProfilingRouter {
  const history = useHistory();
  const currentSchema = useSchemaQueryParam();

  const {
    start: { core },
  } = useProfilingDependencies();

  const link = (path: string, params: { path?: object; query?: { schema?: string } } = {}) => {
    const query = { ...params.query, schema: params.query?.schema ?? currentSchema };

    // @ts-expect-error
    return profilingRouter.link(path, { ...params, query });
  };

  return {
    ...profilingRouter,
    push: (path, ...args) => {
      const next = link(path, ...args);

      history.push(next);
    },
    replace: (path, ...args) => {
      const next = link(path, ...args);
      history.replace(next);
    },
    link: (path, ...args) => {
      return core.http.basePath.prepend('/app/profiling' + link(path, ...args));
    },
  };
}
