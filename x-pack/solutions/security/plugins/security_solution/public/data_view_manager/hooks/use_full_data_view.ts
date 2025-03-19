/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  type DataView,
  type DataViewsServicePublic,
  type DataViewSpec,
} from '@kbn/data-views-plugin/public';
import memoize from 'lodash/memoize';

import { useKibana } from '../../common/lib/kibana';
import { type DataViewManagerScopeName } from '../constants';
import { useDataView } from './use_data_view';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

/**
 * Creates a DataView from the provided DataViewSpec.
 *
 * This is a memoized function that will return the same DataView instance across useFullDataView occurences in the project,
 * for the same dataViewSpec version or title.
 */
const dataViewFromSpec: (
  dataViewsService: DataViewsServicePublic,
  dataViewSpec: DataViewSpec
) => Promise<DataView | undefined> = memoize(
  (dataViewsService: DataViewsServicePublic, dataViewSpec: DataViewSpec) => {
    // NOTE: this should never happen for data views managed by the Data View Manager and is considered an error
    if (!dataViewSpec.id) {
      return Promise.resolve(undefined);
    }

    return dataViewsService.get(dataViewSpec.id);
  },
  (...args) => {
    return args[1]?.version ?? args[1]?.title;
  }
);

/*
 * This hook should be used whenever we need the actual DataView and not just the spec for the
 * selected data view.
 */
export const useFullDataView = (
  dataViewManagerScope: DataViewManagerScopeName
): DataView | undefined => {
  const {
    services: { dataViews },
  } = useKibana();
  const { dataView: dataViewSpec } = useDataView(dataViewManagerScope);
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const [retrievedDataView, setRetrievedDataView] = useState<DataView | undefined>();

  useEffect(() => {
    (async () => {
      setRetrievedDataView(await dataViewFromSpec(dataViews, dataViewSpec));
    })();
  }, [dataViews, dataViewSpec]);

  return useMemo(() => {
    if (!newDataViewPickerEnabled) {
      return undefined;
    }

    return retrievedDataView;
  }, [newDataViewPickerEnabled, retrievedDataView]);
};
