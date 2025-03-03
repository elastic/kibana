/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterGroup } from '@kbn/alerts-ui-shared/src/alert_filter_controls/filter_group';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import type { Filter } from '@kbn/es-query';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useDataViewContext } from '../../hooks/data_view_context';
import type { AssetsURLQuery } from '../../hooks/use_asset_inventory_data_table';
import { ASSET_INVENTORY_INDEX_PATTERN } from '../../constants';
import { FilterGroupLoading } from './filters_loading';
import { ASSET_INVENTORY_RULE_TYPE_IDS } from './rule_type_ids';

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
  setQuery: (v: Partial<AssetsURLQuery>) => void;
}

export const Filters = ({ setQuery }: FiltersProps) => {
  const { dataView, dataViewIsLoading } = useDataViewContext();
  const spaceId = useSpaceId();

  const dataViewSpec = useMemo(
    () =>
      dataView
        ? {
            // TODO We need this hard-coded id because `ASSET_INVENTORY_INDEX_PATTERN` does not populate the filter dropdowns
            id: 'cloud_asset_inventory-2773feaf-50bb-43f8-9fa9-8f9a5f85e566',
            name: ASSET_INVENTORY_INDEX_PATTERN,
            allowNoIndex: true,
            title: dataView.getIndexPattern(),
            timeFieldName: '@timestamp',
          }
        : null,
    [dataView]
  );

  if (!spaceId || !dataViewSpec) {
    return null;
  }

  if (dataViewIsLoading) {
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
        onFiltersChange={(filters: Filter[]) => {
          setQuery({ filters });
        }}
        ruleTypeIds={ASSET_INVENTORY_RULE_TYPE_IDS}
        Storage={Storage}
        defaultControls={DEFAULT_ASSET_INVENTORY_FILTERS}
        chainingSystem="HIERARCHICAL"
        spaceId={spaceId}
        ControlGroupRenderer={ControlGroupRenderer}
        maxControls={4}
      />
      <EuiSpacer size="l" />
    </>
  );
};
