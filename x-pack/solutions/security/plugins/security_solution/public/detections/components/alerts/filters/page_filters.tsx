/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { createKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import type { AlertFilterControlsProps } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { useHistory } from 'react-router-dom';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import type { DataView, DataViewSpec } from '@kbn/data-plugin/common';
import { convertCamelCasedKeysToSnakeCase } from '@kbn/presentation-publishing';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { SECURITY_ALERT_DATA_VIEW } from '../../../constants';

export const DEFAULT_DETECTION_PAGE_FILTERS: FilterControlConfig[] = [
  {
    title: 'Status',
    field_name: 'kibana.alert.workflow_status',
    selected_options: ['open'],
    display_settings: {
      hide_action_bar: true,
      hide_exists: true,
    },
    persist: true,
  },
  {
    title: 'Severity',
    field_name: 'kibana.alert.severity',
    selected_options: [],
    display_settings: {
      hide_action_bar: true,
      hide_exists: true,
    },
  },
  {
    title: 'User',
    field_name: 'user.name',
  },
  {
    title: 'Host',
    field_name: 'host.name',
  },
];

export type PageFiltersProps = Pick<
  AlertFilterControlsProps,
  'filters' | 'onFiltersChange' | 'query' | 'timeRange' | 'onInit'
> & {
  dataView: DataView | DataViewSpec;
};

export const PageFilters = memo(({ dataView, ...props }: PageFiltersProps) => {
  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');

  const { http, notifications, dataViews } = useKibana().services;
  const services = useMemo(
    () => ({
      http,
      notifications,
      dataViews,
      storage: Storage,
    }),
    [dataViews, http, notifications]
  );

  const history = useHistory();
  const urlStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: false,
        useHashQuery: false,
      }),
    [history]
  );
  const filterControlsUrlState = useMemo(() => {
    const pageFilters = urlStorage.get<FilterControlConfig[] | undefined>(URL_PARAM_KEY.pageFilter);
    return pageFilters ? pageFilters.map(convertCamelCasedKeysToSnakeCase) : undefined;
  }, [urlStorage]);

  const setFilterControlsUrlState = useCallback(
    (newFilterControls: FilterControlConfig[]) => {
      urlStorage.set(URL_PARAM_KEY.pageFilter, newFilterControls);
    },
    [urlStorage]
  );

  // TODO change to .getIndexPattern() once we remove the newDataViewPickerEnabled feature flag and we have a DataView object
  const alertsIndicesTitle = useMemo(
    () =>
      dataView.title
        ?.split(',')
        .filter((index) => index.includes(DEFAULT_ALERTS_INDEX))
        .join(','),
    [dataView]
  );

  const customDataViewSpec = useMemo(
    () => ({
      id: SECURITY_ALERT_DATA_VIEW.id,
      name: SECURITY_ALERT_DATA_VIEW.name,
      allowNoIndex: true,
      title: alertsIndicesTitle,
      timeFieldName: '@timestamp',
    }),
    [alertsIndicesTitle]
  );

  const spaceId = useSpaceId();
  if (!spaceId) {
    return null;
  }

  return (
    <AlertFilterControls
      controlsUrlState={filterControlsUrlState}
      dataViewSpec={customDataViewSpec}
      defaultControls={DEFAULT_DETECTION_PAGE_FILTERS}
      maxControls={4}
      preventCacheClearOnUnmount={newDataViewPickerEnabled}
      ruleTypeIds={SECURITY_SOLUTION_RULE_TYPE_IDS}
      services={services}
      setControlsUrlState={setFilterControlsUrlState}
      spaceId={spaceId}
      {...props}
    />
  );
});

PageFilters.displayName = 'PageFilters';
