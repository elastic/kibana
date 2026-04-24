/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { useDispatch, useSelector } from 'react-redux';
import { PageScope } from '../../data_view_manager/constants';
import { sourcererActions, sourcererSelectors } from '../store';
import { useSourcererDataView } from '.';
import { useDataView as useOldDataView } from '../../common/containers/source/use_data_view';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useKibana } from '../../common/lib/kibana';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useSignalIndexName } from '../../data_view_manager/hooks/use_signal_index_name';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useSecuritySolutionInitialization } from '../../common/components/initialization/use_security_solution_initialization';
import {
  INITIALIZATION_FLOW_SECURITY_DATA_VIEWS,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../common/api/initialization';

export const useSignalHelpers = (): {
  /* when defined, signal index has been initiated but does not exist */
  pollForSignalIndex?: () => void;
  /* when false, signal index has been initiated */
  signalIndexNeedsInit: boolean;
} => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { indicesExist } = useSourcererDataView(PageScope.alerts);
  const { indexFieldsSearch } = useOldDataView();
  const dispatch = useDispatch();
  const { addError } = useAppToasts();
  const abortCtrl = useRef(new AbortController());
  const {
    data: { dataViews },
  } = useKibana().services;

  const signalIndexNameSourcerer = useSelector(sourcererSelectors.signalIndexName);
  const experimentalSignalIndexName = useSignalIndexName();
  const oldDefaultDataView = useSelector(sourcererSelectors.defaultDataView);

  // Request sourcerer data view initialization from the backend (legacy path only).
  const initState = useSecuritySolutionInitialization(
    newDataViewPickerEnabled ? [] : [INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]
  );
  const sourcererInitResult = initState[INITIALIZATION_FLOW_SECURITY_DATA_VIEWS];
  const initPayload =
    sourcererInitResult?.result?.status === INITIALIZATION_FLOW_STATUS_READY
      ? sourcererInitResult.result.payload
      : null;

  useEffect(() => {
    if (newDataViewPickerEnabled || initPayload === null) return;
    dispatch(sourcererActions.setSourcererDataViews(initPayload));
    dispatch(sourcererActions.setSignalIndexName({ signalIndexName: initPayload.signalIndexName }));
  }, [dispatch, initPayload, newDataViewPickerEnabled]);

  const signalIndexName = newDataViewPickerEnabled
    ? experimentalSignalIndexName
    : signalIndexNameSourcerer;

  const { dataView: experimentalDefaultDataView, status } = useDataView(PageScope.alerts);

  const defaultDataViewPattern = newDataViewPickerEnabled
    ? experimentalDefaultDataView.getIndexPattern() ?? ''
    : oldDefaultDataView.title;

  const signalIndexNeedsInit = useMemo(() => {
    if (newDataViewPickerEnabled && status === 'pristine') {
      return false;
    }
    return !defaultDataViewPattern.includes(`${signalIndexName}`);
  }, [defaultDataViewPattern, newDataViewPickerEnabled, signalIndexName, status]);

  const shouldWePollForIndex = useMemo(
    () => !indicesExist && !signalIndexNeedsInit,
    [indicesExist, signalIndexNeedsInit]
  );

  const pollForSignalIndex = useCallback(() => {
    const asyncSearch = async () => {
      abortCtrl.current = new AbortController();
      try {
        if (initPayload === null || signalIndexName === null) return;

        const existingIndices = await dataViews.getExistingIndices(
          initPayload.defaultDataView.patternList
        );

        if (existingIndices.includes(signalIndexName)) {
          // Signal index is now physically present — refresh the field list so
          // the sourcerer reflects the real mappings.
          indexFieldsSearch({ dataViewId: initPayload.defaultDataView.id });
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        addError(err, {
          title: i18n.translate('xpack.securitySolution.sourcerer.error.title', {
            defaultMessage: 'Error updating Security Data View',
          }),
          toastMessage: i18n.translate('xpack.securitySolution.sourcerer.error.toastMessage', {
            defaultMessage: 'Refresh the page',
          }),
        });
      }
    };

    if (signalIndexName !== null) {
      abortCtrl.current.abort();
      asyncSearch();
    }
  }, [addError, dataViews, indexFieldsSearch, initPayload, signalIndexName]);

  return {
    ...(shouldWePollForIndex ? { pollForSignalIndex } : {}),
    signalIndexNeedsInit,
  };
};
