/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SourcererScopeName, type SourcererUrlState } from '../../sourcerer/store/model';
import { useInitializeUrlParam, useUpdateUrlParam } from '../../common/utils/global_query_string';
import { URL_PARAM_KEY } from '../../common/hooks/constants';
import type { State } from '../../common/store/types';
import { sourcererSelectors } from '../../common/store/selectors';
import { sourcererActions } from '../../common/store/actions';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { type SelectDataViewAsyncPayload } from '../redux/actions';

// TODO: remove this in cleanup phase Remove deprecated sourcerer code https://github.com/elastic/security-team/issues/12665
export const useSyncSourcererUrlState = (
  scopeId:
    | SourcererScopeName.default
    | SourcererScopeName.explore
    | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const scopeDataViewId = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedDataViewId(state, scopeId);
  });
  const selectedPatterns = useSelector((state: State) => {
    return sourcererSelectors.sourcererScopeSelectedPatterns(state, scopeId);
  });

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const dispatch = useDispatch();

  const updateUrlParam = useUpdateUrlParam<SourcererUrlState>(URL_PARAM_KEY.sourcerer);

  const onInitializeUrlParam = useCallback(
    (initialState: SourcererUrlState | null) => {
      // TODO: This is due to a new feature https://github.com/elastic/security-team/issues/11959
      // if new picker flag is enabled, we should not kick off the legacy url flow
      if (newDataViewPickerEnabled) {
        return;
      }

      // Initialize the store with value from UrlParam.
      if (initialState != null) {
        (Object.keys(initialState) as SourcererScopeName[]).forEach((scope) => {
          if (
            !(scope === SourcererScopeName.default && scopeId === SourcererScopeName.detections)
          ) {
            dispatch(
              sourcererActions.setSelectedDataView({
                id: scope,
                selectedDataViewId: initialState[scope]?.id ?? null,
                selectedPatterns: initialState[scope]?.selectedPatterns ?? [],
              })
            );
          }
        });
      } else {
        // Initialize the UrlParam with values from the store.
        // It isn't strictly necessary but I am keeping it for compatibility with the previous implementation.
        if (scopeDataViewId) {
          updateUrlParam({
            [SourcererScopeName.default]: {
              id: scopeDataViewId,
              selectedPatterns,
            },
          });
        }
      }
    },
    [dispatch, newDataViewPickerEnabled, scopeDataViewId, scopeId, selectedPatterns, updateUrlParam]
  );

  useInitializeUrlParam<SourcererUrlState>(URL_PARAM_KEY.sourcerer, onInitializeUrlParam);
};

/**
 * Restores data view selection automatically if (and only if) the sourcerer url param is set during app init. (only during the initial render)
 * See `useInitializeUrlParam` for details.
 * The param itself is updated in the picker component, after user changes the selection manually.
 */
export const useRestoreDataViewManagerStateFromURL = (
  initDataViewPickerWithSelection: (initialSelection: SelectDataViewAsyncPayload[]) => void,
  scopeId:
    | SourcererScopeName.default
    | SourcererScopeName.explore
    | SourcererScopeName.detections = SourcererScopeName.default
) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const onInitializeUrlParam = useCallback(
    (initialState: SourcererUrlState | null) => {
      // TODO: This is due to a new feature https://github.com/elastic/security-team/issues/11959
      // dont do anything if new picker is not enabled
      if (!newDataViewPickerEnabled) {
        return;
      }

      if (initialState === null) {
        return initDataViewPickerWithSelection([]);
      }

      // Select data view for specific scope, based on the UrlParam.
      const urlBasedSelection = (Object.keys(initialState) as SourcererScopeName[])
        .map((scope) => {
          // NOTE: looks like this is about skipping the init when the active page is detections
          // We should investigate this.
          if (scope === SourcererScopeName.default && scopeId === SourcererScopeName.detections) {
            return undefined;
          }

          return {
            scope,
            id: initialState[scope]?.id,
            fallbackPatterns: initialState[scope]?.selectedPatterns,
          };
        })
        .filter(Boolean) as SelectDataViewAsyncPayload[];

      initDataViewPickerWithSelection(urlBasedSelection);
    },
    [initDataViewPickerWithSelection, newDataViewPickerEnabled, scopeId]
  );

  useInitializeUrlParam<SourcererUrlState>(URL_PARAM_KEY.sourcerer, onInitializeUrlParam);
};
