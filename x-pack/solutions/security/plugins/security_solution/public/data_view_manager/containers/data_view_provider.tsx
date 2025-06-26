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
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

const DefaultDataViewContext = createContext<DataView | undefined>(undefined);

/**
 * Internal-only hook to fetch default data view in given space, during init
 */
export const useDefaultDataView = () => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const defaultDataView = useContext(DefaultDataViewContext);

  if (!newDataViewPickerEnabled) {
    return { id: '', title: '' } as DataView;
  }

  if (!defaultDataView) {
    throw new Error('Could not fetch default data view');
  }

  return defaultDataView;
};

export const DefaultDataViewProvider: FC<PropsWithChildren> = ({ children }) => {
  const { dataViews, uiSettings, spaces, application, http } = useKibana().services;

  const [defaultDataView, setDefaultDataView] = useState<DataView>();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  useEffect(() => {
    (async () => {
      // NOTE: being defensive
      if (defaultDataView || !newDataViewPickerEnabled) {
        return;
      }

      const { defaultDataView: defaultDataViewMetadata } = await createDefaultDataView({
        dataViewService: dataViews,
        uiSettings,
        spaces,
        application,
        http,
      });

      const dataView = await dataViews?.get(defaultDataViewMetadata.id);

      setDefaultDataView(dataView);
    })();
  }, [application, dataViews, defaultDataView, http, newDataViewPickerEnabled, spaces, uiSettings]);

  return (
    <DefaultDataViewContext.Provider value={defaultDataView}>
      {defaultDataView || !newDataViewPickerEnabled ? children : null}
    </DefaultDataViewContext.Provider>
  );
};
