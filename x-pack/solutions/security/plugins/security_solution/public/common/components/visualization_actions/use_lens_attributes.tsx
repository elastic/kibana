/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { SecurityPageName } from '../../../../common/constants';
import { NetworkRouteType } from '../../../explore/network/pages/navigation/types';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import type { LensAttributes, UseLensAttributesProps } from './types';
import {
  fieldNameExistsFilter,
  getDetailsPageFilter,
  getESQLGlobalFilters,
  getIndexFilters,
  getNetworkDetailsPageFilter,
  sourceOrDestinationIpExistsFilter,
} from './utils';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';
import { useGlobalFilterQuery } from '../../hooks/use_global_filter_query';

export const useLensAttributes = ({
  applyGlobalQueriesAndFilters = true,
  applyPageAndTabsFilters = true,
  extraOptions,
  getLensAttributes,
  lensAttributes,
  scopeId = PageScope.default,
  stackByField,
  title,
  esql,
  signalIndexName,
}: UseLensAttributesProps): LensAttributes | null => {
  const { euiTheme } = useEuiTheme();
  const { dataView } = useDataView(scopeId);
  const dataViewSelectedPatterns = useSelectedPatterns(scopeId);
  const indicesExist = !!dataView.matchedIndices?.length;
  const selectedPatterns = useMemo(() => {
    if (signalIndexName) {
      return [signalIndexName];
    } else {
      return dataViewSelectedPatterns;
    }
  }, [dataViewSelectedPatterns, signalIndexName]);

  const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const getGlobalFiltersQuerySelector = useMemo(
    () => inputsSelectors.globalFiltersQuerySelector(),
    []
  );
  const globalQuery = useDeepEqualSelector(getGlobalQuerySelector);
  const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);
  const [{ detailName, pageName, tabName }] = useRouteSpy();

  const tabsFilters = useMemo(() => {
    if (tabName === NetworkRouteType.events) {
      if (pageName === SecurityPageName.network) {
        return sourceOrDestinationIpExistsFilter;
      }
      return fieldNameExistsFilter(pageName);
    }

    return [];
  }, [pageName, tabName]);

  const pageFilters = useMemo(() => {
    if (
      [SecurityPageName.hosts, SecurityPageName.users].indexOf(pageName) >= 0 &&
      detailName != null
    ) {
      return getDetailsPageFilter(pageName, detailName);
    }

    if (SecurityPageName.network === pageName) {
      return getNetworkDetailsPageFilter(detailName);
    }

    return [];
  }, [detailName, pageName]);
  const { filterQuery: globalFilterQuery } = useGlobalFilterQuery();

  const attrs: LensAttributes = useMemo(
    () =>
      lensAttributes ??
      ((getLensAttributes &&
        stackByField !== null &&
        getLensAttributes({
          stackByField,
          euiTheme,
          extraOptions,
          esql,
        })) as LensAttributes),
    [esql, euiTheme, extraOptions, getLensAttributes, lensAttributes, stackByField]
  );

  const hasAdHocDataViews = Object.values(attrs?.state?.adHocDataViews ?? {}).length > 0;

  const lensAttrsWithInjectedData = useMemo(() => {
    if (
      lensAttributes == null &&
      (getLensAttributes == null || stackByField === null || stackByField?.length === 0)
    ) {
      return null;
    }

    const indexFilters = hasAdHocDataViews ? [] : getIndexFilters(selectedPatterns);
    const query = esql ? { esql } : globalQuery;

    const queryFilters = (() => {
      if (!applyGlobalQueriesAndFilters) return [];

      if (esql) {
        return getESQLGlobalFilters(globalFilterQuery);
      }

      return filters;
    })();

    return {
      ...attrs,
      ...(title != null ? { title } : {}),
      state: {
        ...attrs.state,
        ...(applyGlobalQueriesAndFilters ? { query } : {}),
        filters: [
          ...attrs.state.filters,
          ...(applyPageAndTabsFilters ? pageFilters : []),
          ...(applyPageAndTabsFilters ? tabsFilters : []),
          ...indexFilters,
          ...queryFilters,
        ],
      },
      references: attrs?.references?.map((ref: { id: string; name: string; type: string }) => ({
        ...ref,
        id: dataView.id ?? '',
      })),
    } as LensAttributes;
  }, [
    lensAttributes,
    getLensAttributes,
    stackByField,
    hasAdHocDataViews,
    selectedPatterns,
    esql,
    globalQuery,
    globalFilterQuery,
    attrs,
    title,
    applyGlobalQueriesAndFilters,
    applyPageAndTabsFilters,
    pageFilters,
    tabsFilters,
    filters,
    dataView.id,
  ]);
  return hasAdHocDataViews || (!hasAdHocDataViews && indicesExist)
    ? lensAttrsWithInjectedData
    : null;
};
