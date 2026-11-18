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
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import type { LensAttributes, UseLensAttributesProps } from './types';
import {
  buildIndexFilters,
  fieldNameExistsFilter,
  getDetailsPageFilter,
  getESQLGlobalFilters,
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
  excludedPatterns,
}: UseLensAttributesProps): LensAttributes | null => {
  const { euiTheme } = useEuiTheme();
  const { dataView } = useDataView(scopeId);
  const dataViewSelectedPatterns = useSelectedPatterns(dataView);
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
    if (tabName === 'events') {
      if (pageName === SecurityPageName.network) {
        return sourceOrDestinationIpExistsFilter;
      }
      if (
        extraOptions?.entityStoreV2Enabled === true &&
        (pageName === SecurityPageName.hosts || pageName === SecurityPageName.users)
      ) {
        return [];
      }
      return fieldNameExistsFilter(pageName);
    }

    return [];
  }, [extraOptions?.entityStoreV2Enabled, pageName, tabName]);

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

    const indexFilters = buildIndexFilters({
      hasAdHocDataViews,
      selectedPatterns,
      excludedPatterns,
      signalIndexName,
    });
    const query = esql ? { esql } : globalQuery;

    const queryFilters = (() => {
      if (!applyGlobalQueriesAndFilters) return [];

      if (esql) {
        return getESQLGlobalFilters(globalFilterQuery);
      }

      return filters;
    })();

    // Unpersisted data views exist only in this session. Attach a field-less spec so a new app
    // context (e.g. "Open in Lens") can resolve the id. `toSpec(false)` omits the field list;
    // the receiving context loads fields itself.
    const scopeAdHocDataView =
      !hasAdHocDataViews && dataView.id && !dataView.isPersisted()
        ? { [dataView.id]: dataView.toSpec(false) }
        : undefined;

    const rewrittenReferences =
      attrs?.references?.map((ref: { id: string; name: string; type: string }) => ({
        ...ref,
        id: dataView.id ?? '',
      })) ?? [];

    // These ids are not saved objects. Keep index-pattern refs on state.internalReferences so
    // save-to-library and case attachments do not record a missing index-pattern reference.
    const [references, internalReferences] = scopeAdHocDataView
      ? [
          rewrittenReferences.filter((ref) => ref.type !== 'index-pattern'),
          [
            ...(attrs.state.internalReferences ?? []),
            ...rewrittenReferences.filter((ref) => ref.type === 'index-pattern'),
          ],
        ]
      : [rewrittenReferences, attrs.state.internalReferences];

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
        ...(scopeAdHocDataView ? { adHocDataViews: scopeAdHocDataView, internalReferences } : {}),
      },
      references,
    } as LensAttributes;
  }, [
    lensAttributes,
    getLensAttributes,
    stackByField,
    hasAdHocDataViews,
    selectedPatterns,
    excludedPatterns,
    signalIndexName,
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
    dataView,
  ]);
  return hasAdHocDataViews || (!hasAdHocDataViews && indicesExist)
    ? lensAttrsWithInjectedData
    : null;
};
