/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';

import { useSelector } from 'react-redux';
import { useKibana } from '../../common/lib/kibana';
import { DataViewManagerScopeName } from '../constants';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { sourcererAdapterSelector } from '../redux/selectors';
import type { SharedDataViewSelectionState } from '../redux/types';
import { useDefaultDataView } from '../containers/data_view_provider';

export interface UseDataViewValue {
  dataView: DataView;
  status: SharedDataViewSelectionState['status'];
}

/*
 * This hook should be used whenever we need the actual DataView and not just the spec for the
 * selected data view.
 */
export const useDataView = (
  dataViewManagerScope: DataViewManagerScopeName = DataViewManagerScopeName.default
): UseDataViewValue => {
  const {
    services: { dataViews },
    notifications,
  } = useKibana();
  const defaultDataView = useDefaultDataView();

  const { dataViewId, status: internalStatus } = useSelector(
    sourcererAdapterSelector(dataViewManagerScope)
  );
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const [retrievedDataView, setRetrievedDataView] = useState<DataView>(defaultDataView);

  useEffect(() => {
    (async () => {
      if (!newDataViewPickerEnabled) {
        return;
      }

      if (!dataViewId || internalStatus !== 'ready') {
        return;
      }

      try {
        // TODO: remove conditional .get call when new data view picker is stabilized
        // this is due to the fact that many of our tests mock kibana hook and do not provide proper
        // double for dataViews service
        const currDv = await dataViews?.get(dataViewId);
        setRetrievedDataView(currDv);
      } catch (error) {
        // TODO: (remove conditional call when feature flag is on (mocks are broken for some tests))
        notifications?.toasts?.danger({
          title: 'Error retrieving data view',
          body: `Error: ${error?.message ?? 'unknown'}`,
        });
      }
    })();
  }, [dataViews, dataViewId, internalStatus, notifications, newDataViewPickerEnabled]);

  return useMemo(() => {
    return { dataView: retrievedDataView, status: retrievedDataView ? internalStatus : 'loading' };
  }, [retrievedDataView, internalStatus]);
};
