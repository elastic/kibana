/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { KibanaReactContextValue } from '@kbn/kibana-react-plugin/public';
import { createKibanaReactContext, useKibana } from '@kbn/kibana-react-plugin/public';
import { useMemo } from 'react';
import type {
  ObservabilityLogsExplorerAppMountParameters,
  ObservabilityLogsExplorerPluginStart,
  ObservabilityLogsExplorerStartDeps,
} from '../types';

export type PluginKibanaContextValue = CoreStart &
  ObservabilityLogsExplorerStartDeps &
  ObservabilityLogsExplorerPluginStart & {
    appParams: ObservabilityLogsExplorerAppMountParameters;
  };

export const createKibanaContextForPlugin = (
  core: CoreStart,
  plugins: ObservabilityLogsExplorerStartDeps,
  pluginStart: ObservabilityLogsExplorerPluginStart,
  appParams: ObservabilityLogsExplorerAppMountParameters
) =>
  createKibanaReactContext<PluginKibanaContextValue>({
    ...core,
    ...plugins,
    ...pluginStart,
    appParams,
  });

export const useKibanaContextForPlugin =
  useKibana as () => KibanaReactContextValue<PluginKibanaContextValue>;

export const useKibanaContextForPluginProvider = (
  core: CoreStart,
  plugins: ObservabilityLogsExplorerStartDeps,
  pluginStart: ObservabilityLogsExplorerPluginStart,
  appParams: ObservabilityLogsExplorerAppMountParameters
) => {
  const { Provider } = useMemo(
    () => createKibanaContextForPlugin(core, plugins, pluginStart, appParams),
    [appParams, core, pluginStart, plugins]
  );

  return Provider;
};
