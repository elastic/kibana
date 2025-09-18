/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { createKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import type { AlertFilterControlsProps } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { useHistory } from 'react-router-dom';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import type { DataView, DataViewSpec } from '@kbn/data-plugin/common';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import { DEFAULT_DETECTION_PAGE_FILTERS } from '../../../../../common/constants';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { SECURITY_ALERT_DATA_VIEW } from '../../../constants';

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
  const filterControlsUrlState = useMemo(
    () => urlStorage.get<FilterControlConfig[] | undefined>(URL_PARAM_KEY.pageFilter) ?? undefined,
    [urlStorage]
  );

  const setFilterControlsUrlState = useCallback(
    (newFilterControls: FilterControlConfig[]) => {
      urlStorage.set(URL_PARAM_KEY.pageFilter, newFilterControls);
    },
    [urlStorage]
  );

  const customDataViewSpec = useMemo(
    () => ({
      id: SECURITY_ALERT_DATA_VIEW.id,
      name: SECURITY_ALERT_DATA_VIEW.name,
      allowNoIndex: true,
      title: dataView.title, // TODO change to .getIndexPattern() once we remove the newDataViewPickerEnabled feature flag and we have a DataView object
      timeFieldName: '@timestamp',
    }),
    [dataView]
  );

  const spaceId = useSpaceId();
  if (!spaceId) {
    return null;
  }

  return (
    <AlertFilterControls
      chainingSystem="HIERARCHICAL"
      ControlGroupRenderer={ControlGroupRenderer}
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
