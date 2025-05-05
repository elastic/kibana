/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FilterGroup } from '@kbn/alerts-ui-shared/src/alert_filter_controls/filter_group';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import type { Filter } from '@kbn/es-query';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ControlGroupRenderer } from '@kbn/controls-plugin/public';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useDataViewContext } from '../../hooks/data_view_context';
import type { AssetsURLQuery } from '../../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { ASSET_FIELDS } from '../../constants';
import { FilterGroupLoading } from './asset_inventory_filters_loading';
import { ASSET_INVENTORY_RULE_TYPE_IDS } from './asset_inventory_rule_type_ids';

const DEFAULT_ASSET_INVENTORY_FILTERS: FilterControlConfig[] = [
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.filters.type', {
      defaultMessage: 'Type',
    }),
    fieldName: ASSET_FIELDS.ENTITY_TYPE,
  },
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.filters.name', {
      defaultMessage: 'Name',
    }),
    fieldName: ASSET_FIELDS.ENTITY_NAME,
  },
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.filters.id', {
      defaultMessage: 'ID',
    }),
    fieldName: ASSET_FIELDS.ENTITY_ID,
  },
];

export interface AssetInventoryFiltersProps {
  setQuery: (v: Partial<AssetsURLQuery>) => void;
}

export const AssetInventoryFilters = ({ setQuery }: AssetInventoryFiltersProps) => {
  const { dataView, dataViewIsLoading } = useDataViewContext();
  const spaceId = useSpaceId();

  if (!spaceId) {
    // TODO Add error handling if no spaceId is found
    return null;
  }

  if (dataViewIsLoading) {
    return (
      <>
        <EuiSpacer size="l" />
        <EuiFlexItem grow={true}>
          <FilterGroupLoading />
        </EuiFlexItem>
        <EuiSpacer size="l" />
      </>
    );
  }

  return (
    <>
      <EuiSpacer size="l" />
      <FilterGroup
        dataViewId={dataView.id || null}
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
