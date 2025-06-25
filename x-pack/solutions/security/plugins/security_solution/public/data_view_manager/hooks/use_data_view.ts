/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect, useMemo, useState } from 'react';
import { type DataView } from '@kbn/data-views-plugin/public';

import { useSelector } from 'react-redux';
import { useKibana } from '../../common/lib/kibana';
import { DataViewManagerScopeName } from '../constants';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { sourcererAdapterSelector } from '../redux/selectors';
import type { SharedDataViewSelectionState } from '../redux/types';
import { DataViewContext } from '../containers/SafeDataViewProvider';

export interface UseDataViewAsyncReturnValue {
  dataView: DataView | undefined;
  status: SharedDataViewSelectionState['status'];
  scope: DataViewManagerScopeName;
}

type ConditionalReturn<IsSync extends boolean> = IsSync extends true
  ? DataView
  : UseDataViewAsyncReturnValue;

export { type DataView };

/*
 * This hook should be used whenever we need the actual DataView and not just the spec for the
 * selected data view.
 */
export const useDataView = <IsSync extends boolean = false>(
  dataViewManagerScope: DataViewManagerScopeName = DataViewManagerScopeName.default,
  /**
   * If isSync is set to true, return value is guaranteed to be a data view instance,
   * given there is a SafeDataViewProvider on top level for the current component tree
   */
  isSync?: IsSync
): ConditionalReturn<IsSync> => {
  const {
    services: { dataViews },
    notifications,
  } = useKibana();

  const { dataViewId, status: internalStatus } = useSelector(
    sourcererAdapterSelector(dataViewManagerScope)
  );
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const [retrievedDataView, setRetrievedDataView] = useState<DataView | undefined>();

  useEffect(() => {
    (async () => {
      // NOTE: in sync mode, we are not firing useEffect again and reuse the top level data view
      if (isSync) {
        return;
      }

      if (!dataViewId || internalStatus !== 'ready') {
        return setRetrievedDataView(undefined);
      }

      try {
        // TODO: remove conditional .get call when new data view picker is stabilized
        // this is due to the fact that many of our tests mock kibana hook and do not provide proper
        // double for dataViews service
        const currDv = await dataViews?.get(dataViewId);
        setRetrievedDataView(currDv);
      } catch (error) {
        setRetrievedDataView(undefined);
        // TODO: (remove conditional call when feature flag is on (mocks are broken for some tests))
        notifications?.toasts?.danger({
          title: 'Error retrieving data view',
          body: `Error: ${error?.message ?? 'unknown'}`,
        });
      }
    })();
  }, [dataViews, dataViewId, internalStatus, notifications, isSync]);

  // TODO: naming, maybe extract this into separate function or hook
  const dataViewsPerScope = useContext(DataViewContext);

  return useMemo(() => {
    if (!isSync) {
      if (!newDataViewPickerEnabled) {
        return {
          dataView: undefined,
          status: internalStatus,
          scope: dataViewManagerScope,
        } as ConditionalReturn<IsSync>;
      }

      return {
        dataView: retrievedDataView,
        status: retrievedDataView ? internalStatus : 'loading',
        scope: dataViewManagerScope,
      } as ConditionalReturn<IsSync>;
    }

    if (!newDataViewPickerEnabled) {
      return {} as ConditionalReturn<IsSync>;
    }

    if (!dataViewsPerScope) {
      throw new Error('You can only use useDataViewSafe inside DataViewProvider');
    }

    if (!(dataViewManagerScope in dataViewsPerScope.results)) {
      throw new Error(
        'No safeguards exist for requested scope, make sure it is included in `scopes` property of the wrapping DataViewProvider'
      );
    }

    const dataView = dataViewsPerScope.results[dataViewManagerScope].dataView;

    if (!dataView) {
      throw new Error(
        'Missing data view. This error should not occur (earlier conditions should fire or the fallback should be still rendered instead)'
      );
    }

    return dataView as ConditionalReturn<IsSync>;
  }, [
    isSync,
    newDataViewPickerEnabled,
    dataViewsPerScope,
    dataViewManagerScope,
    retrievedDataView,
    internalStatus,
  ]);
};
