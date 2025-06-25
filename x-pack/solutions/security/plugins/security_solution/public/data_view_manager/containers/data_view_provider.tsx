/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { createDefaultDataView } from '../utils/create_default_data_view';

const DefaultDataViewContext = createContext<DataView | undefined>(undefined);

export const useDefaultDataView = () => {
  const defaultDataView = useContext(DefaultDataViewContext);

  if (!defaultDataView) {
    throw new Error('Could not fetch default data view');
  }

  return defaultDataView;
};

export const DefaultDataViewProvider: FC<PropsWithChildren> = ({ children }) => {
  const { dataViews, uiSettings, spaces, application, http } = useKibana().services;

  const [defaultDataView, setDefaultDataView] = useState<DataView>();

  useEffect(() => {
    (async () => {
      const { defaultDataView: dv } = await createDefaultDataView({
        dataViewService: dataViews,
        uiSettings,
        spaces,
        application,
        http,
      });

      const dataView = await dataViews?.get(dv.id);

      setDefaultDataView(dataView);
    })();
  }, [application, dataViews, http, spaces, uiSettings]);

  return (
    <DefaultDataViewContext.Provider value={defaultDataView}>
      {defaultDataView ? children : null}
    </DefaultDataViewContext.Provider>
  );
};
