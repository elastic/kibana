/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { useMemo } from 'react';
import type { StreamsAppRouter, StreamsAppRoutes } from '../routes/config';
import { streamsAppRouter } from '../routes/config';
import { useKibana } from './use_kibana';

interface StatefulStreamsAppRouter extends StreamsAppRouter {
  push<T extends PathsOf<StreamsAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<StreamsAppRoutes, T>>
  ): void;
  replace<T extends PathsOf<StreamsAppRoutes>>(
    path: T,
    ...params: TypeAsArgs<TypeOf<StreamsAppRoutes, T>>
  ): void;
}

export function useStreamsAppRouter(): StatefulStreamsAppRouter {
  const {
    core: {
      http,
      application: { navigateToApp },
    },
  } = useKibana();

  const link = (...args: any[]) => {
    // @ts-expect-error
    return streamsAppRouter.link(...args);
  };

  return useMemo<StatefulStreamsAppRouter>(
    () => ({
      ...streamsAppRouter,
      push: (...args) => {
        const next = link(...args);
        navigateToApp('streams', { path: next, replace: false });
      },
      replace: (path, ...args) => {
        const next = link(path, ...args);
        navigateToApp('streams', { path: next, replace: true });
      },
      link: (path, ...args) => {
        return http.basePath.prepend('/app/streams' + link(path, ...args));
      },
    }),
    [navigateToApp, http.basePath]
  );
}
