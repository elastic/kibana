/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useCallback } from 'react';
import { EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterGroup } from '@kbn/alerts-ui-shared/src/alert_filter_controls/filter_group';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import type { Filter } from '@kbn/es-query';
import { createKbnUrlStateStorage, Storage } from '@kbn/kibana-utils-plugin/public';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { useHistory } from 'react-router-dom';
import { useDataViewContext } from '../../hooks/data_view_context';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { FilterGroupLoading } from './filters_loading';
import { ASSET_INVENTORY_RULE_TYPE_IDS } from './rule_type_ids';

const SECURITY_ASSET_INVENTORY_DATA_VIEW = {
  id: 'asset-inventory-logs-default',
  name: 'asset-inventory-logs',
};

const DEFAULT_ASSET_INVENTORY_FILTERS: FilterControlConfig[] = [
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.filters.type', {
      defaultMessage: 'Type',
    }),
    fieldName: 'entity.category',
  },
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.filters.criticality', {
      defaultMessage: 'Criticality',
    }),
    fieldName: 'asset.criticality',
  },
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.filters.tags', {
      defaultMessage: 'Tags',
    }),
    fieldName: 'asset.tags.name',
  },
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.filters.name', {
      defaultMessage: 'Name',
    }),
    fieldName: 'asset.name',
  },
];

export interface FiltersProps {
  onFiltersChange: (newFilters: Filter[]) => void;
}

export const Filters = ({ onFiltersChange }: FiltersProps) => {
  const { dataView: indexPattern, dataViewIsLoading, dataViewIsRefetching } = useDataViewContext();
  const { from, to } = useGlobalTime();
  const spaceId = useSpaceId();
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
    () =>
      urlStorage.get<FilterControlConfig[] | undefined>(URL_PARAM_KEY.assetInventory) ?? undefined,
    [urlStorage]
  );

  const setFilterControlsUrlState = useCallback(
    (newFilterControls: FilterControlConfig[]) => {
      urlStorage.set(URL_PARAM_KEY.assetInventory, newFilterControls);
    },
    [urlStorage]
  );

  const dataViewSpec = useMemo(
    () =>
      indexPattern
        ? {
            id: SECURITY_ASSET_INVENTORY_DATA_VIEW.id,
            name: SECURITY_ASSET_INVENTORY_DATA_VIEW.name,
            allowNoIndex: true,
            title: indexPattern.title,
            timeFieldName: '@timestamp',
          }
        : null,
    [indexPattern]
  );

  const handleFilterChanges = useCallback(
    (newFilters: Filter[]) => {
      if (!onFiltersChange) {
        return;
      }
      const updatedFilters = newFilters.map((filter) => {
        return {
          ...filter,
          meta: {
            ...filter.meta,
            disabled: false,
          },
        };
      });

      onFiltersChange(updatedFilters);
    },
    [onFiltersChange]
  );

  if (!spaceId || !dataViewSpec) {
    return null;
  }

  if (dataViewIsLoading || dataViewIsRefetching) {
    return (
      <EuiFlexItem grow={true}>
        <FilterGroupLoading />
      </EuiFlexItem>
    );
  }

  return (
    <>
      <EuiSpacer size="l" />
      <FilterGroup
        dataViewId={dataViewSpec?.id || null}
        onFiltersChange={handleFilterChanges}
        ruleTypeIds={ASSET_INVENTORY_RULE_TYPE_IDS}
        Storage={Storage}
        defaultControls={DEFAULT_ASSET_INVENTORY_FILTERS}
        chainingSystem="HIERARCHICAL"
        spaceId={spaceId}
        controlsUrlState={filterControlsUrlState}
        setControlsUrlState={setFilterControlsUrlState}
        ControlGroupRenderer={ControlGroupRenderer}
        maxControls={4}
        timeRange={{
          from,
          to,
          mode: 'absolute',
        }}
      />
      <EuiSpacer size="l" />
    </>
  );
};
