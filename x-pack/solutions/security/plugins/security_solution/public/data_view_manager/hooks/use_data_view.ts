/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useSelector } from 'react-redux';
import { type FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { useKibana } from '../../common/lib/kibana';
import { PageScope } from '../constants';
import { sourcererAdapterSelector } from '../redux/selectors';
import type { SharedDataViewSelectionState } from '../redux/types';

const INITIAL_DV = new DataView({
  fieldFormats: {} as FieldFormatsStartCommon,
});

export interface UseDataViewReturnValue {
  dataView: DataView;
  status: SharedDataViewSelectionState['status'];
}

/*
 * This hook should be used whenever we need the actual DataView and not just the spec for the
 * selected data view.
 */
export const useDataView = (
  dataViewManagerScope: PageScope = PageScope.default
): UseDataViewReturnValue => {
  const {
    services: { dataViews, notifications },
  } = useKibana();

  const { dataViewId, status: internalStatus } = useSelector(
    sourcererAdapterSelector(dataViewManagerScope)
  );
  const [localStatus, setLocalStatus] =
    useState<SharedDataViewSelectionState['status']>('pristine');
  const [retrievedDataView, setRetrievedDataView] = useState<DataView>(INITIAL_DV);
  const loadedForTheFirstTimeRef = useRef(false);

  useEffect(() => {
    (async () => {
      if (!dataViewId || internalStatus !== 'ready') {
        return;
      }

      if (loadedForTheFirstTimeRef.current) {
        setLocalStatus('loading');
      }

      try {
        // TODO: remove conditional .get call when new data view picker is stabilized
        // this is due to the fact that many of our tests mock kibana hook and do not provide proper
        // double for dataViews service
        const currDv = await dataViews?.get(dataViewId);
        if (!loadedForTheFirstTimeRef.current) {
          loadedForTheFirstTimeRef.current = true;
        }
        setRetrievedDataView(currDv);
        setLocalStatus('ready');
      } catch (error) {
        // TODO: (remove conditional call when feature flag is on (mocks are broken for some tests))
        notifications?.toasts?.addDanger({
          title: 'Error retrieving data view',
          text: `Error: ${error?.message ?? 'unknown'}`,
        });
        setLocalStatus('error');
      }
    })();
  }, [dataViewManagerScope, dataViews, dataViewId, internalStatus, notifications]);

  return useMemo(
    () => ({ dataView: retrievedDataView, status: localStatus }),
    [retrievedDataView, localStatus]
  );
};
