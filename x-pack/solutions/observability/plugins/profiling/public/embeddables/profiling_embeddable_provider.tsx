/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React, { ReactChild, useMemo } from 'react';
import { CoreSetup, CoreStart } from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ProfilingDependenciesContextProvider } from '../components/contexts/profiling_dependencies/profiling_dependencies_context';
import { ProfilingPluginPublicSetupDeps, ProfilingPluginPublicStartDeps } from '../types';
import { Services } from '../services';

export interface ProfilingEmbeddablesDependencies {
  coreStart: CoreStart;
  coreSetup: CoreSetup<ProfilingPluginPublicStartDeps>;
  pluginsStart: ProfilingPluginPublicStartDeps;
  pluginsSetup: ProfilingPluginPublicSetupDeps;
  profilingFetchServices: Services;
}

const storage = new Storage(localStorage);

export type GetProfilingEmbeddableDependencies = () => Promise<ProfilingEmbeddablesDependencies>;

interface Props {
  deps: ProfilingEmbeddablesDependencies;
  children: ReactChild;
}

export function ProfilingEmbeddableProvider({ deps, children }: Props) {
  const profilingDependencies = useMemo(
    () => ({
      start: {
        core: deps.coreStart,
        ...deps.pluginsStart,
      },
      setup: {
        core: deps.coreSetup,
        ...deps.pluginsSetup,
      },
      services: deps.profilingFetchServices,
    }),
    [deps]
  );

  const i18nCore = deps.coreStart.i18n;

  return (
    <i18nCore.Context>
      <KibanaContextProvider services={{ ...deps.coreStart, ...deps.pluginsStart, storage }}>
        <ProfilingDependenciesContextProvider value={profilingDependencies}>
          {children}
        </ProfilingDependenciesContextProvider>
      </KibanaContextProvider>
    </i18nCore.Context>
  );
}
