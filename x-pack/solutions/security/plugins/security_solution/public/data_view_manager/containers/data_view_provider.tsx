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

const fallbackDataView = { id: '', title: '', toSpec: () => ({ id: '', title: '' }) } as DataView;

export interface DefaultDataViewsContextValue {
  defaultDataView: DataView;
  alertDataView: DataView;
}

const DefaultDataViewContext = createContext<DefaultDataViewsContextValue | undefined>(undefined);

/**
 * Internal-only hook to fetch default data view in given space, during init
 */
export const useDefaultDataViews = () => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const defaultDataViews = useContext(DefaultDataViewContext);

  if (!newDataViewPickerEnabled) {
    return {
      defaultDataView: fallbackDataView,
      alertDataView: fallbackDataView,
    } as unknown as DefaultDataViewsContextValue;
  }

  if (!defaultDataViews) {
    throw new Error('Could not fetch default data view');
  }

  return defaultDataViews;
};

export const DefaultDataViewProvider: FC<PropsWithChildren> = ({ children }) => {
  const { dataViews, uiSettings, spaces, application, http } = useKibana().services;

  const [defaultDataViews, setDefaultDataViews] = useState<{
    defaultDataView: DataView;
    alertDataView: DataView;
  }>();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  useEffect(() => {
    (async () => {
      // NOTE: being defensive
      if (defaultDataViews || !newDataViewPickerEnabled) {
        return;
      }

      const { defaultDataView: defaultDataViewMetadata, alertDataView: alertDataViewSpec } =
        await createDefaultDataView({
          dataViewService: dataViews,
          uiSettings,
          spaces,
          application,
          http,
        });

      const [dataView, alertDataView] = await Promise.all([
        dataViews?.get(defaultDataViewMetadata.id),
        dataViews?.get(alertDataViewSpec.id),
      ]);

      setDefaultDataViews({ defaultDataView: dataView, alertDataView });
    })();
  }, [
    application,
    dataViews,
    defaultDataViews,
    http,
    newDataViewPickerEnabled,
    spaces,
    uiSettings,
  ]);

  return (
    <DefaultDataViewContext.Provider value={defaultDataViews}>
      {defaultDataViews || !newDataViewPickerEnabled ? children : null}
    </DefaultDataViewContext.Provider>
  );
};
