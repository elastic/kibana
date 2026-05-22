/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { LazySavedSearchComponent } from '@kbn/saved-search-component';
import useAsync from 'react-use/lib/useAsync';
import { Global, css } from '@emotion/react';
import {
  buildCustomFilter,
  FilterStateStore,
  fromKueryExpression,
  toElasticsearchQuery,
} from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useAssetDetailsUrlState } from '../../hooks/use_asset_details_url_state';

export const Logs = () => {
  const { euiTheme } = useEuiTheme();
  const { dateRange } = useDatePickerContext();
  const [urlState] = useAssetDetailsUrlState();
  const { entity } = useAssetDetailsRenderPropsContext();
  const textQueryDebounced = urlState?.logsSearch ?? '';

  const {
    services: {
      logsDataAccess: {
        services: { logSourcesService },
      },
      embeddable,
      dataViews,
      data: {
        search: { searchSource },
      },
    },
  } = useKibanaContextForPlugin();

  const logSources = useAsync(logSourcesService.getFlattenedLogSources);

  const entityContextFilter = useMemo(
    () => [
      toElasticsearchQuery(
        fromKueryExpression(`${findInventoryFields(entity.type).id}: "${entity.id}"`)
      ),
    ],
    [entity.type, entity.id]
  );

  // User search filter - should be highlighted
  const userSearchFilter = useMemo(() => {
    if (!textQueryDebounced || textQueryDebounced.trim() === '') {
      return [];
    }

    try {
      return [toElasticsearchQuery(fromKueryExpression(textQueryDebounced))];
    } catch (err) {
      // Invalid/incomplete query, return empty array to avoid breaking the component
      return [];
    }
  }, [textQueryDebounced]);

  // User search filters - WILL be highlighted
  const documentFilters = useMemo<Filter[]>(() => {
    // Exit early if no log sources
    if (!logSources.value) {
      return [];
    }

    // Add user search filter (enable highlighting)
    if (userSearchFilter.length > 0) {
      return [
        buildCustomFilter(
          logSources.value,
          userSearchFilter[0],
          false,
          false,
          'User Search',
          FilterStateStore.APP_STATE
        ),
      ];
    }

    return [];
  }, [userSearchFilter, logSources.value]);

  // Entity context filters - WON'T be highlighted
  const nonHighlightingFilters = useMemo<Filter[]>(() => {
    // Exit early if no log sources
    if (!logSources.value) {
      return [];
    }

    // Add entity context filter (skip highlighting)
    if (entityContextFilter.length > 0) {
      return [
        buildCustomFilter(
          logSources.value,
          entityContextFilter[0],
          false,
          false,
          'Entity Context',
          FilterStateStore.APP_STATE
        ),
      ];
    }

    return [];
  }, [entityContextFilter, logSources.value]);

  return (
    <>
      <Global
        styles={css`
          .DiscoverFlyout {
            z-index: ${euiTheme.levels.mask} !important;
          }
        `}
      />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          {logSources.value ? (
            <LazySavedSearchComponent
              dependencies={{ embeddable, searchSource, dataViews }}
              index={logSources.value}
              timeRange={dateRange}
              filters={documentFilters}
              nonHighlightingFilters={nonHighlightingFilters}
              height="68vh"
              displayOptions={{
                solutionNavIdOverride: 'oblt',
                enableFilters: false,
              }}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
