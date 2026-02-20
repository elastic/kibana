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
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '@kbn/elastic-assistant-common';
import type { DataView } from '@kbn/data-plugin/common';
import { useKibana } from '../../../../common/lib/kibana';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';

const DEFAULT_ATTACKS_PAGE_FILTERS: FilterControlConfig[] = [
  {
    title: 'Status',
    field_name: 'kibana.alert.workflow_status',
    selected_options: ['open'],
    persist: true,
    display_settings: {
      hide_action_bar: true,
      hide_exists: true,
    },
  },
];

const RULE_TYPES = [...SECURITY_SOLUTION_RULE_TYPE_IDS, ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID];

export type PageFiltersProps = Pick<
  AlertFilterControlsProps,
  'filters' | 'onFiltersChange' | 'query' | 'timeRange' | 'onInit'
> & {
  dataView: DataView;
};

const FILTER_CONTROLS_STORAGE_KEY = 'attacks-page-filters';

export const PageFilters = memo(({ dataView, ...props }: PageFiltersProps) => {
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
  const filterControlsUrlState = useMemo(
    () => urlStorage.get<FilterControlConfig[] | undefined>(URL_PARAM_KEY.pageFilter) ?? undefined,
    [urlStorage]
  );

  const setFilterControlsUrlState = useCallback(
    (newFilterControls: FilterControlConfig[]) =>
      urlStorage.set(URL_PARAM_KEY.pageFilter, newFilterControls),
    [urlStorage]
  );

  const customDataViewSpec = useMemo(
    () => ({
      id: dataView.id,
      name: dataView.name,
      allowNoIndex: dataView.allowNoIndex,
      title: dataView.getIndexPattern(),
      timeFieldName: dataView.timeFieldName,
    }),
    [dataView]
  );

  const spaceId = useSpaceId();
  if (!spaceId) {
    return null;
  }

  return (
    <AlertFilterControls
      controlsUrlState={filterControlsUrlState}
      dataViewSpec={customDataViewSpec}
      defaultControls={DEFAULT_ATTACKS_PAGE_FILTERS}
      maxControls={4}
      preventCacheClearOnUnmount={true}
      ruleTypeIds={RULE_TYPES}
      services={services}
      setControlsUrlState={setFilterControlsUrlState}
      spaceId={spaceId}
      storageKey={FILTER_CONTROLS_STORAGE_KEY}
      {...props}
    />
  );
});

PageFilters.displayName = 'PageFilters';
