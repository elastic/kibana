/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { safeDecode } from '@kbn/rison';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { type DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import {
  normalizeUrlState,
  hydrateDataSourceSelection,
  getDiscoverColumnsWithFallbackFieldsFromDisplayOptions,
  getDiscoverFiltersFromState,
} from './logs_explorer_url_schema';
import { DisplayOptions } from './logs_explorer_schema_types';

const DEFAULT_ALL_SELECTION = { selectionType: 'all' as const };

export const renderDiscoverRedirect = (
  core: CoreStart,
  discover: DiscoverStart,
  appParams: AppMountParameters
) => {
  ReactDOM.render(
    <Router history={appParams.history}>
      <DiscoverRedirect core={core} discover={discover} />
    </Router>,
    appParams.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(appParams.element);
  };
};

export const DiscoverRedirect = ({
  core,
  discover,
}: {
  core: CoreStart;
  discover: DiscoverStart;
}) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const pageStateEncoded = searchParams.get('pageState') || '';
  const rawPageState = safeDecode(pageStateEncoded) || {};
  const parsedState = normalizeUrlState(rawPageState);
  if (parsedState) {
    const dataViewSpec = parsedState.dataSourceSelection
      ? hydrateDataSourceSelection(parsedState.dataSourceSelection, DEFAULT_ALL_SELECTION)
      : hydrateDataSourceSelection(DEFAULT_ALL_SELECTION, DEFAULT_ALL_SELECTION);

    const discoverParams: DiscoverAppLocatorParams = {
      indexPatternId: dataViewSpec.id,
      timeRange: parsedState.time,
      refreshInterval: parsedState.refreshInterval,
      filters: getDiscoverFiltersFromState(dataViewSpec.id, parsedState.filters),
      query: parsedState.query,
      breakdownField: parsedState.chart?.breakdownField ?? undefined,
      columns: getDiscoverColumnsWithFallbackFieldsFromDisplayOptions(
        parsedState as DisplayOptions
      ),
      grid: {
        rowHeight: parsedState.grid?.rows?.rowHeight,
        rowsPerPage: parsedState.grid?.rows?.rowsPerPage,
      },
    };

    discover.locator?.navigate(discoverParams);
  } else {
    discover.locator?.navigate({});
  }

  return <></>;
};
