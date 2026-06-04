/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { PageScope } from '../constants';
import { type SourcererUrlState } from '../../sourcerer/store/model';
import { useInitializeUrlParam } from '../../common/utils/global_query_string';
import { URL_PARAM_KEY } from '../../common/hooks/constants';
import { type SelectDataViewAsyncPayload } from '../redux/actions';

/**
 * Restores data view selection automatically if (and only if) the sourcerer url param is set during app init. (only during the initial render)
 * See `useInitializeUrlParam` for details.
 * The param itself is updated in the picker component, after user changes the selection manually.
 */
export const useRestoreDataViewManagerStateFromURL = (
  initDataViewPickerWithSelection: (initialSelection: SelectDataViewAsyncPayload[]) => void,
  scopeId:
    | PageScope.default
    | PageScope.explore
    | PageScope.attacks
    | PageScope.alerts = PageScope.default
) => {
  const onInitializeUrlParam = useCallback(
    (initialState: SourcererUrlState | null) => {
      if (initialState === null) {
        return initDataViewPickerWithSelection([]);
      }

      // Select data view for specific scope, based on the UrlParam.
      const urlBasedSelection = (Object.keys(initialState) as PageScope[])
        .map((scope) => {
          // NOTE: looks like this is about skipping the init when the active page is alerts
          // We should investigate this.
          if (scope === PageScope.default && scopeId === PageScope.alerts) {
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
    [initDataViewPickerWithSelection, scopeId]
  );

  useInitializeUrlParam<SourcererUrlState>(URL_PARAM_KEY.sourcerer, onInitializeUrlParam);
};
