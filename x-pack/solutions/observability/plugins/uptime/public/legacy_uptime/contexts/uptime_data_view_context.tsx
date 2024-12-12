/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, FC, PropsWithChildren } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { useHasData } from '../components/overview/empty_state/use_has_data';

export const UptimeDataViewContext = createContext({} as DataView);

export const UptimeDataViewContextProvider: FC<
  PropsWithChildren<{
    dataViews: DataViewsPublicPluginStart;
  }>
> = ({ children, dataViews }) => {
  const { settings, data: indexStatus } = useHasData();

  const heartbeatIndices = settings?.heartbeatIndices || '';

  const { data } = useFetcher<Promise<DataView | undefined>>(async () => {
    if (heartbeatIndices && indexStatus?.indexExists) {
      // this only creates an dateView in memory, not as saved object
      return dataViews.create({ title: heartbeatIndices });
    }
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Uptime folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heartbeatIndices, indexStatus?.indexExists]);

  return <UptimeDataViewContext.Provider value={data!} children={children} />;
};

export const useUptimeDataView = () => useContext(UptimeDataViewContext);
