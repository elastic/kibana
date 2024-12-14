/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, FC, PropsWithChildren } from 'react';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../common/constants';

export const SyntheticsDataViewContext = createContext({} as DataView);

export const SyntheticsDataViewContextProvider: FC<
  PropsWithChildren<{
    dataViews: DataViewsPublicPluginStart;
  }>
> = ({ children, dataViews }) => {
  const { data } = useFetcher<Promise<DataView | undefined>>(async () => {
    return dataViews.create({ title: SYNTHETICS_INDEX_PATTERN });
  }, [dataViews]);

  return <SyntheticsDataViewContext.Provider value={data!} children={children} />;
};

export const useSyntheticsDataView = () => useContext(SyntheticsDataViewContext);
