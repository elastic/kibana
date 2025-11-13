/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { RiskBadge } from '../../../asset_inventory/components/risk_badge';
import { type AssetInventoryDataTableProps } from '../../../asset_inventory/components/asset_inventory_data_table';
import { AssetInventoryTableSection } from '../../../asset_inventory/components/asset_inventory_table_section';
import {
  ASSET_FIELDS,
  ASSET_INVENTORY_DATA_VIEW_ID_PREFIX,
} from '../../../asset_inventory/constants';
import {
  useAssetInventoryURLState,
  type AssetsBaseURLQuery,
  type URLQuery,
} from '../../../asset_inventory/hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { DataViewContext } from '../../../asset_inventory/hooks/data_view_context';
import { useDataView } from '../../../asset_inventory/hooks/use_data_view';
import { AssetInventoryLoading } from '../../../asset_inventory/components/asset_inventory_loading';
import { DataViewNotFound } from '../../../asset_inventory/components/errors/data_view_not_found';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useNavigateToTimeline } from '../../../overview/components/detection_response/hooks/use_navigate_to_timeline';
import { EntityTypeToIdentifierField, EntityType } from '../../../../common/entity_analytics/types';

const getDefaultQuery = ({ query, filters, pageFilters }: AssetsBaseURLQuery): URLQuery => ({
  query,
  filters,
  pageFilters,
  sort: [['@timestamp', 'desc']],
});

const ENTITY_TYPE_RISK_FIELDS: Record<string, string[]> = {
  identity: ['user.risk.calculated_score_norm', 'entity.risk.calculated_score_norm', 'entity.risk'],
  user: ['user.risk.calculated_score_norm', 'entity.risk.calculated_score_norm', 'entity.risk'],
  host: ['host.risk.calculated_score_norm', 'entity.risk.calculated_score_norm', 'entity.risk'],
  service: [
    'service.risk.calculated_score_norm',
    'entity.risk.calculated_score_norm',
    'entity.risk',
  ],
  generic: ['entity.risk.calculated_score_norm', 'entity.risk'],
};

const INITIAL_COLUMNS: NonNullable<AssetInventoryDataTableProps['initialColumns']> = [
  { id: ASSET_FIELDS.ENTITY_NAME, width: 320 },
  { id: ASSET_FIELDS.ENTITY_ID },
  { id: ASSET_FIELDS.ENTITY_TYPE },
  { id: ASSET_FIELDS.TIMESTAMP },
  { id: ASSET_FIELDS.ENTITY_RISK },
  { id: ASSET_FIELDS.ASSET_CRITICALITY },
];

const COLUMN_HEADERS_OVERRIDE: Record<string, string> = {
  [ASSET_FIELDS.ENTITY_RISK]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.threatHunting.entitiesTable.riskScore',
    {
      defaultMessage: 'Risk score',
    }
  ),
  [ASSET_FIELDS.ASSET_CRITICALITY]: i18n.translate(
    'xpack.securitySolution.entityAnalytics.threatHunting.entitiesTable.assetCriticality',
    {
      defaultMessage: 'Asset criticality',
    }
  ),
};

const ThreatHuntingEntitiesTableInner: React.FC = () => {
  const { openTimelineWithFilters } = useNavigateToTimeline();
  const urlState = useAssetInventoryURLState({
    defaultQuery: getDefaultQuery,
  });

  const customCellRenderers = useCallback<
    NonNullable<AssetInventoryDataTableProps['customCellRendererOverrides']>
  >(
    (rows: DataTableRecord[]): CustomCellRenderer => ({
      [ASSET_FIELDS.ENTITY_NAME]: ({ rowIndex }) => {
        const row = rows[rowIndex];
        const flattened = row.flattened;
        const name = flattened[ASSET_FIELDS.ENTITY_NAME] as string | undefined;
        const rawEntityType = flattened[ASSET_FIELDS.ENTITY_TYPE];
        const entityType =
          typeof rawEntityType === 'string' ? rawEntityType.toLowerCase() : undefined;
        const normalizedEntityType =
          entityType && EntityType[entityType as keyof typeof EntityType];
        const identifierField = normalizedEntityType
          ? EntityTypeToIdentifierField[normalizedEntityType]
          : EntityTypeToIdentifierField[EntityType.generic];
        const identifierValueRaw = flattened[identifierField];
        const identifierValue = Array.isArray(identifierValueRaw)
          ? identifierValueRaw[0]
          : identifierValueRaw;
        const normalizedIdentifierValue =
          typeof identifierValue === 'string' && identifierValue.length > 0
            ? identifierValue
            : undefined;

        const displayName = name ?? normalizedIdentifierValue ?? '';

        const handleTimelineClick = () => {
          if (!normalizedIdentifierValue) {
            return;
          }

          openTimelineWithFilters([
            [
              {
                field: identifierField,
                value: normalizedIdentifierValue,
              },
            ],
          ]);
        };

        const actionsContainerStyles = css`
          display: inline-flex;
          gap: 4px;
          align-items: center;
        `;

        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem grow={false}>
              <span css={actionsContainerStyles}>
                <EuiButtonIcon
                  iconType="timeline"
                  color="primary"
                  onClick={handleTimelineClick}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.threatHunting.entitiesTable.actions.timeline',
                    {
                      defaultMessage: 'Open timeline for {name}',
                      values: { name: displayName },
                    }
                  )}
                  size="s"
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiText size="s">
                <span>{name ?? '—'}</span>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
      [ASSET_FIELDS.ENTITY_RISK]: ({ rowIndex }) => {
        const row = rows[rowIndex];
        const flattened = row.flattened;
        const rawEntityType = flattened[ASSET_FIELDS.ENTITY_TYPE];
        const entityType =
          typeof rawEntityType === 'string' ? rawEntityType.toLowerCase() : undefined;
        const candidateFields =
          ENTITY_TYPE_RISK_FIELDS[entityType ?? ''] ?? ENTITY_TYPE_RISK_FIELDS.generic;
        const riskValue = candidateFields.reduce<number | undefined>((acc, fieldName) => {
          if (acc != null) {
            return acc;
          }
          const value = flattened[fieldName];
          const candidate = Array.isArray(value) ? value[0] : value;
          if (candidate == null) {
            return acc;
          }
          const numeric = Number(candidate);
          return Number.isFinite(numeric) ? numeric : acc;
        }, undefined);

        if (riskValue == null) {
          return '—';
        }

        const roundedRisk = Number(riskValue.toFixed(2));

        return <RiskBadge risk={roundedRisk} />;
      },
    }),
    [openTimelineWithFilters]
  );

  const dataTableProps = useMemo<Partial<Omit<AssetInventoryDataTableProps, 'state'>>>(
    () => ({
      initialColumns: INITIAL_COLUMNS,
      columnHeadersOverride: COLUMN_HEADERS_OVERRIDE,
      customCellRendererOverrides: customCellRenderers,
      columnsOverride: INITIAL_COLUMNS.map((column): string => column.id),
    }),
    [customCellRenderers]
  );

  return (
    <div data-test-subj="threatHuntingEntitiesTable">
      <AssetInventoryTableSection state={urlState} dataTableProps={dataTableProps} />
    </div>
  );
};

export const ThreatHuntingEntitiesTable: React.FC = () => {
  const spaceId = useSpaceId();
  const dataViewQuery = useDataView(
    spaceId ? `${ASSET_INVENTORY_DATA_VIEW_ID_PREFIX}-${spaceId}` : undefined
  );

  const dataViewContextValue = useMemo(() => {
    if (!dataViewQuery.data) {
      return null;
    }

    return {
      dataView: dataViewQuery.data,
      dataViewRefetch: dataViewQuery.refetch,
      dataViewIsLoading: dataViewQuery.isLoading,
      dataViewIsRefetching: dataViewQuery.isRefetching,
    };
  }, [
    dataViewQuery.data,
    dataViewQuery.refetch,
    dataViewQuery.isLoading,
    dataViewQuery.isRefetching,
  ]);

  if (dataViewQuery.isLoading) {
    return <AssetInventoryLoading />;
  }

  if (dataViewQuery.isError || !dataViewContextValue) {
    return <DataViewNotFound refetchDataView={dataViewQuery.refetch} />;
  }

  return (
    <DataViewContext.Provider value={dataViewContextValue}>
      <ThreatHuntingEntitiesTableInner />
    </DataViewContext.Provider>
  );
};

ThreatHuntingEntitiesTable.displayName = 'ThreatHuntingEntitiesTable';
