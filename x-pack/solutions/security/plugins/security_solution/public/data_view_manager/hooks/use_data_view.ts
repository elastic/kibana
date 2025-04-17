/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { type DataView } from '@kbn/data-views-plugin/public';

import { useSelector } from 'react-redux';
import { useKibana } from '../../common/lib/kibana';
import { type DataViewManagerScopeName } from '../constants';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { sourcererAdapterSelector } from '../redux/selectors';
import type { SharedDataViewSelectionState } from '../redux/types';

/*
 * This hook should be used whenever we need the actual DataView and not just the spec for the
 * selected data view.
 */
export const useDataView = (
  dataViewManagerScope: DataViewManagerScopeName
): { dataView: DataView | undefined; status: SharedDataViewSelectionState['status'] } => {
  const {
    services: { dataViews },
  } = useKibana();

  const { dataViewId, status: internalStatus } = useSelector(
    sourcererAdapterSelector(dataViewManagerScope)
  );
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const [retrievedDataView, setRetrievedDataView] = useState<DataView | undefined>();

  useEffect(() => {
    (async () => {
      if (!dataViewId || internalStatus !== 'ready') {
        return setRetrievedDataView(undefined);
      }

      // TODO: remove conditional .get call when new data view picker is stabilized
      // this is due to the fact that many of our tests mock kibana hook and do not provide proper
      // double for dataViews service
      setRetrievedDataView(await dataViews?.get(dataViewId));
    })();
  }, [dataViews, dataViewId, internalStatus]);

  return useMemo(() => {
    if (!newDataViewPickerEnabled) {
      return { dataView: undefined, status: internalStatus };
    }

    return { dataView: retrievedDataView, status: retrievedDataView ? internalStatus : 'loading' };
  }, [newDataViewPickerEnabled, retrievedDataView, internalStatus]);
};
