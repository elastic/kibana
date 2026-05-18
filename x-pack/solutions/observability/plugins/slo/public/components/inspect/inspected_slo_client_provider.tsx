/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { useInspectorContext, FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { PluginContext } from '../../context/plugin_context';
import { usePluginContext } from '../../hooks/use_plugin_context';
import type { SLORepositoryClient } from '../../types';

export function InspectedSloClientProvider({ children }: { children: React.ReactNode }) {
  const { addInspectorRequest } = useInspectorContext();
  const pluginContextValue = usePluginContext();
  const history = useHistory();

  const addInspectorRequestRef = useRef(addInspectorRequest);
  addInspectorRequestRef.current = addInspectorRequest;

  const inspectedSloClient = useMemo(() => {
    const { sloClient } = pluginContextValue;

    const wrappedFetch: SLORepositoryClient['fetch'] = (endpoint, ...args) => {
      const requestPathname = history.location.pathname;
      return sloClient.fetch(endpoint, ...args).then((response) => {
        if (history.location.pathname === requestPathname) {
          addInspectorRequestRef.current({
            data: response as any,
            status: FETCH_STATUS.SUCCESS,
            loading: false,
          });
        }

        if (response && typeof response === 'object') {
          const resp = response as Record<string, unknown>;

          if ('_wrapped' in resp && '_inspect' in resp) {
            return resp._wrapped as typeof response;
          }

          if ('_inspect' in resp) {
            const { _inspect, ...rest } = resp;
            return rest as typeof response;
          }
        }

        return response;
      });
    };

    return {
      fetch: wrappedFetch,
      stream: sloClient.stream,
    } as SLORepositoryClient;
  }, [pluginContextValue, history]);

  const contextValue = useMemo(
    () => ({
      ...pluginContextValue,
      sloClient: inspectedSloClient,
    }),
    [pluginContextValue, inspectedSloClient]
  );

  return <PluginContext.Provider value={contextValue}>{children}</PluginContext.Provider>;
}
