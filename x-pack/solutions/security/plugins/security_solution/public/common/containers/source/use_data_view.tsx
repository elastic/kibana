/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import type { Subscription } from 'rxjs';
import { useDispatch } from 'react-redux';
import memoizeOne from 'memoize-one';
import type { BrowserFields } from '@kbn/timelines-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { FieldCategory } from '@kbn/timelines-plugin/common/search_strategy';

import { getCategory } from '@kbn/response-ops-alerts-fields-browser/helpers';
import { useKibana } from '../../lib/kibana';
import { sourcererActions } from '../../../sourcerer/store';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { getSourcererDataView } from '../../../sourcerer/containers/get_sourcerer_data_view';
import * as i18n from './translations';
import { useAppToasts } from '../../hooks/use_app_toasts';

export type IndexFieldSearch = (param: {
  dataViewId: string;
  scopeId?: SourcererScopeName;
  needToBeInit?: boolean;
  cleanCache?: boolean;
  skipScopeUpdate?: boolean;
}) => Promise<void>;

type DangerCastForBrowserFieldsMutation = Record<string, FieldCategory>;
interface DataViewInfo {
  /**
   * @deprecated use fields list on dataview / "indexPattern"
   * about to use browserFields? Reconsider! Maybe you can accomplish
   * everything you need via the `fields` property on the data view
   * you are working with? Or perhaps you need a description for a
   * particular field? Consider using the EcsFlat module from `@kbn/ecs`
   */
  browserFields: DangerCastForBrowserFieldsMutation;
}

/**
 * HOT Code path where the fields can be 16087 in length or larger. This is
 * VERY mutatious on purpose to improve the performance of the transform.
 */
export const getDataViewStateFromIndexFields = memoizeOne(
  (_title: string, fields: DataViewSpec['fields']): DataViewInfo => {
    // Adds two dangerous casts to allow for mutations within this function
    type DangerCastForMutation = Record<string, {}>;
    if (fields == null) {
      return { browserFields: {} };
    } else {
      const browserFields: BrowserFields = {};
      for (const [name, field] of Object.entries(fields)) {
        const category = getCategory(name);
        if (browserFields[category] == null) {
          (browserFields as DangerCastForMutation)[category] = { fields: {} };
        }
        const categoryFields = browserFields[category].fields;
        if (categoryFields) {
          categoryFields[name] = field;
        }
      }
      return { browserFields: browserFields as DangerCastForBrowserFieldsMutation };
    }
  },
  (newArgs, lastArgs) => newArgs[0] === lastArgs[0] && newArgs[1]?.length === lastArgs[1]?.length
);

export const useDataView = (): {
  indexFieldsSearch: IndexFieldSearch;
} => {
  const { data } = useKibana().services;
  const abortCtrl = useRef<Record<string, AbortController>>({});
  const searchSubscription$ = useRef<Record<string, Subscription>>({});
  const dispatch = useDispatch();
  const { addError } = useAppToasts();
  const setLoading = useCallback(
    ({ id, loading }: { id: string; loading: boolean }) => {
      dispatch(sourcererActions.setDataViewLoading({ id, loading }));
    },
    [dispatch]
  );
  const indexFieldsSearch = useCallback<IndexFieldSearch>(
    ({
      dataViewId,
      scopeId = SourcererScopeName.default,
      needToBeInit = false,
      cleanCache = false,
      skipScopeUpdate = false,
    }) => {
      const asyncSearch = async () => {
        try {
          abortCtrl.current = {
            ...abortCtrl.current,
            [dataViewId]: new AbortController(),
          };
          setLoading({ id: dataViewId, loading: true });

          const dataView = await getSourcererDataView(dataViewId, data.dataViews, cleanCache);
          if (needToBeInit && scopeId && !skipScopeUpdate) {
            dispatch(
              sourcererActions.setSelectedDataView({
                id: scopeId,
                selectedDataViewId: dataViewId,
                selectedPatterns: dataView.patternList,
              })
            );
          }
          dispatch(sourcererActions.setDataView({ ...dataView, loading: false }));
        } catch (exc) {
          addError(exc?.message, {
            title: i18n.ERROR_INDEX_FIELDS_SEARCH,
          });
        }
      };
      if (searchSubscription$.current[dataViewId]) {
        searchSubscription$.current[dataViewId].unsubscribe();
      }
      if (abortCtrl.current[dataViewId]) {
        abortCtrl.current[dataViewId].abort();
      }
      return asyncSearch();
    },
    [setLoading, data.dataViews, dispatch, addError]
  );

  return { indexFieldsSearch };
};
