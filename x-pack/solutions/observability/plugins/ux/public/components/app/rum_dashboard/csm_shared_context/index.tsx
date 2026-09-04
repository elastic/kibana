/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { uxSearchIndex } from '../../../../../common/otel_rum';
import { useFetcher } from '../../../../hooks/use_fetcher';

interface SharedData {
  totalPageViews: number;
}

interface ContextType {
  dataView?: DataView;
  sharedData: SharedData;
  setSharedData: (data: SharedData) => void;
}

const defaultContext: ContextType = {
  sharedData: { totalPageViews: 0 },
  setSharedData: (d) => {
    throw new Error('setSharedData was not initialized, set it when you invoke the context');
  },
};

export const CsmSharedContext = createContext(defaultContext);

export function CsmSharedContextProvider({ children }: { children: JSX.Element }) {
  const [newData, setNewData] = useState<SharedData>({ totalPageViews: 0 });
  const [dataView, setDataView] = useState<DataView>();

  const setSharedData = React.useCallback((data: SharedData) => {
    setNewData(data);
  }, []);

  const {
    services: { dataViews },
  } = useKibana<{ dataViews: DataViewsPublicPluginStart }>();

  const searchIndex = uxSearchIndex();

  const { data } = useFetcher<Promise<DataView | undefined>>(async () => {
    if (!dataViews) {
      return undefined;
    }
    return dataViews.create({
      title: searchIndex,
      timeFieldName: '@timestamp',
    });
  }, [searchIndex, dataViews]);

  useEffect(() => {
    setDataView(data);
  }, [data]);

  const value = useMemo(() => {
    return { sharedData: newData, setSharedData, dataView };
  }, [newData, setSharedData, dataView]);

  return <CsmSharedContext.Provider value={value} children={children} />;
}
