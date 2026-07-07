/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { PageScope } from '../../data_view_manager/constants';
import { useDataView as useOldDataView } from '../../common/containers/source/use_data_view';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useKibana } from '../../common/lib/kibana';
import { useDataView } from '../../data_view_manager/hooks/use_data_view';
import { useSignalIndexName } from '../../data_view_manager/hooks/use_signal_index_name';
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
  const { dataView, status } = useDataView(PageScope.alerts);
  const indicesExist = dataView.hasMatchedIndices();

  const { indexFieldsSearch } = useOldDataView();
  const { addError } = useAppToasts();
  const abortCtrl = useRef(new AbortController());
  const {
    data: { dataViews },
  } = useKibana().services;

  const experimentalSignalIndexName = useSignalIndexName();

  // Request sourcerer data view initialization from the backend (legacy path only).
  const initState = useSecuritySolutionInitialization([INITIALIZATION_FLOW_SECURITY_DATA_VIEWS]);
  // @ts-ignore
  const dataViewInitResult = initState[INITIALIZATION_FLOW_SECURITY_DATA_VIEWS];
  const initPayload =
    dataViewInitResult?.result?.status === INITIALIZATION_FLOW_STATUS_READY
      ? dataViewInitResult.result.payload
      : null;

  const signalIndexName = experimentalSignalIndexName;

  const defaultDataViewPattern = dataView.getIndexPattern() ?? '';

  const signalIndexNeedsInit = useMemo(() => {
    if (status === 'pristine') {
      return false;
    }
    return !defaultDataViewPattern.includes(`${signalIndexName}`);
  }, [defaultDataViewPattern, signalIndexName, status]);

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
