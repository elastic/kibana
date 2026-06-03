/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useInspectorContext, FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { PluginContext } from '../../context/plugin_context';
import { usePluginContext } from '../../hooks/use_plugin_context';
import type { SLORepositoryClient } from '../../types';

export function InspectedSloClientProvider({ children }: { children: React.ReactNode }) {
  const { addInspectorRequest, inspectorAdapters } = useInspectorContext();
  const pluginContextValue = usePluginContext();
  const { pathname } = useLocation();

  const addInspectorRequestRef = useRef(addInspectorRequest);
  addInspectorRequestRef.current = addInspectorRequest;

  useEffect(() => {
    inspectorAdapters.requests.reset();
  }, [pathname, inspectorAdapters]);

  const inspectedSloClient = useMemo(() => {
    const { sloClient } = pluginContextValue;

    const wrappedFetch: SLORepositoryClient['fetch'] = (endpoint, ...args) => {
      return sloClient.fetch(endpoint, ...args).then((response) => {
        addInspectorRequestRef.current({
          data: response as any,
          status: FETCH_STATUS.SUCCESS,
          loading: false,
        });

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
  }, [pluginContextValue]);

  const contextValue = useMemo(
    () => ({
      ...pluginContextValue,
      sloClient: inspectedSloClient,
    }),
    [pluginContextValue, inspectedSloClient]
  );

  return <PluginContext.Provider value={contextValue}>{children}</PluginContext.Provider>;
}
