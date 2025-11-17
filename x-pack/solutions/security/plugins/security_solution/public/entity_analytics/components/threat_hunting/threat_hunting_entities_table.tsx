/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { AssetInventoryDataTable } from '../../../asset_inventory/components/asset_inventory_data_table';
import type { AssetInventoryURLStateResult } from '../../../asset_inventory/hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { ASSET_FIELDS, DEFAULT_TABLE_SECTION_HEIGHT } from '../../../asset_inventory/constants';
import type { GenericEntityRecord } from '../../../asset_inventory/types/generic_entity_record';
import { EntityType, EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { useInvestigateInTimeline } from '../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { createDataProviders } from '../../../app/actions/add_to_timeline/data_provider';
import { formatRiskScoreWholeNumber } from '../../common/utils';
import { RiskSeverity } from '../../../../common/search_strategy';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { useAssetInventoryGrouping } from '../../../asset_inventory/components/grouping/use_asset_inventory_grouping';
import { GroupWrapper } from '../../../asset_inventory/components/grouping/asset_inventory_grouping';

const THREAT_HUNTING_TABLE_ID = 'threat-hunting-table';

interface ThreatHuntingEntitiesTableProps {
  state: AssetInventoryURLStateResult;
  height?: number;
}

/**
 * Creates data providers for timeline investigation based on entity type and name
 */
const createEntityDataProviders = (
  entityType: string | undefined,
  entityName: string | undefined,
  entityId: string | undefined
) => {
  if (!entityName || !entityType) {
    return null;
  }

  // Map entity type to the appropriate field name
  let fieldName: string;
  switch (entityType) {
    case EntityType.user:
      fieldName = EntityTypeToIdentifierField[EntityType.user];
      break;
    case EntityType.host:
      fieldName = EntityTypeToIdentifierField[EntityType.host];
      break;
    case EntityType.service:
      fieldName = EntityTypeToIdentifierField[EntityType.service];
      break;
    default:
      // For generic entities, use entity.id
      fieldName = 'entity.id';
  }

  const dataProviders = createDataProviders({
    contextId: THREAT_HUNTING_TABLE_ID,
    field: fieldName,
    values: entityName,
  });

  return dataProviders;
};

/**
 * Helper to determine risk level from risk score
 */
const getRiskLevelFromScore = (score: number): RiskSeverity => {
  if (score >= 70) return RiskSeverity.Critical;
  if (score >= 50) return RiskSeverity.High;
  if (score >= 30) return RiskSeverity.Moderate;
  if (score >= 20) return RiskSeverity.Low;
  return RiskSeverity.Unknown;
};

/**
 * Custom cell renderer for Risk Score column with color scheme matching Privileged User Monitoring
 */
const RiskScoreCellRenderer = ({
  rowIndex,
  rows,
}: EuiDataGridCellValueElementProps & { rows: DataTableRecord[] }) => {
  const { euiTheme } = useEuiTheme();
  const record = rows[rowIndex];
  const source = record.raw._source as GenericEntityRecord | undefined;
  const entityType = source?.entity?.EngineMetadata?.Type;

  // Get entity-specific risk score and level fields
  let riskScore: number | undefined;
  let riskLevel: RiskSeverity | undefined;

  if (entityType === EntityType.user) {
    riskScore = record.flattened['user.risk.calculated_score_norm'] as number | undefined;
    riskLevel = record.flattened['user.risk.calculated_level'] as RiskSeverity | undefined;
  } else if (entityType === EntityType.host) {
    riskScore = record.flattened['host.risk.calculated_score_norm'] as number | undefined;
    riskLevel = record.flattened['host.risk.calculated_level'] as RiskSeverity | undefined;
  } else if (entityType === EntityType.service) {
    riskScore = record.flattened['service.risk.calculated_score_norm'] as number | undefined;
    riskLevel = record.flattened['service.risk.calculated_level'] as RiskSeverity | undefined;
  } else {
    // Fallback to generic entity.risk field if entity type is not recognized
    riskScore = record.flattened[ASSET_FIELDS.ENTITY_RISK] as number | undefined;
    riskLevel = record.flattened['entity.risk_level'] as RiskSeverity | undefined;
  }

  if (riskScore === undefined && !riskLevel) {
    return getEmptyTagValue();
  }

  // Determine risk level from risk score if not directly available
  const level = riskLevel || (riskScore ? getRiskLevelFromScore(riskScore) : RiskSeverity.Unknown);

  const colors: { background: string; text: string } = (() => {
    switch (level) {
      case RiskSeverity.Unknown:
        return {
          background: euiTheme.colors.backgroundBaseSubdued,
          text: euiTheme.colors.textSubdued,
        };
      case RiskSeverity.Low:
        return {
          background: euiTheme.colors.backgroundBaseNeutral,
          text: euiTheme.colors.textNeutral,
        };
      case RiskSeverity.Moderate:
        return {
          background: euiTheme.colors.backgroundLightWarning,
          text: euiTheme.colors.textWarning,
        };
      case RiskSeverity.High:
        return {
          background: euiTheme.colors.backgroundLightRisk,
          text: euiTheme.colors.textRisk,
        };
      case RiskSeverity.Critical:
        return {
          background: euiTheme.colors.backgroundLightDanger,
          text: euiTheme.colors.textDanger,
        };
      default:
        return {
          background: euiTheme.colors.backgroundBaseSubdued,
          text: euiTheme.colors.textSubdued,
        };
    }
  })();

  return (
    <EuiBadge color={colors.background}>
      <EuiText
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
        size={'s'}
        color={colors.text}
      >
        {riskScore
          ? formatRiskScoreWholeNumber(riskScore)
          : i18n.translate('xpack.securitySolution.entityAnalytics.threatHunting.riskScore.na', {
              defaultMessage: 'N/A',
            })}
      </EuiText>
    </EuiBadge>
  );
};

/**
 * Custom cell renderer for Entity Name with Timeline icon
 */
const EntityNameWithTimelineRenderer = ({
  rowIndex,
  rows,
}: EuiDataGridCellValueElementProps & { rows: DataTableRecord[] }) => {
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();

  const record = rows[rowIndex];
  const source = record.raw._source as GenericEntityRecord | undefined;
  const entityName = source?.entity?.name;
  const entityType = source?.entity?.EngineMetadata?.Type;
  const entityId = source?.entity?.id;
  const displayName = (entityName ||
    (record.flattened[ASSET_FIELDS.ENTITY_NAME] as string | undefined) ||
    '') as string;

  const handleTimelineClick = useCallback(() => {
    const dataProviders = createEntityDataProviders(entityType, entityName, entityId);
    if (dataProviders && dataProviders.length > 0) {
      investigateInTimeline({
        dataProviders,
      });
    }
  }, [entityType, entityName, entityId, investigateInTimeline]);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {canUseTimeline && entityName && (
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate(
              'xpack.securitySolution.entityAnalytics.threatHunting.investigateInTimeline',
              {
                defaultMessage: 'Investigate in timeline',
              }
            )}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              iconType="timeline"
              size="s"
              color="text"
              onClick={handleTimelineClick}
              aria-label={i18n.translate(
                'xpack.securitySolution.entityAnalytics.threatHunting.investigateInTimeline',
                {
                  defaultMessage: 'Investigate in timeline',
                }
              )}
              data-test-subj="threat-hunting-timeline-icon"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// Create custom cell renderers that extend the base ones
const createThreatHuntingCustomRenderers = (): ((
  rows: DataTableRecord[]
) => CustomCellRenderer) => {
  return (rows: DataTableRecord[]): CustomCellRenderer => ({
    // Override entity name to include timeline icon
    [ASSET_FIELDS.ENTITY_NAME]: (props: EuiDataGridCellValueElementProps) => (
      <EntityNameWithTimelineRenderer {...props} rows={rows} />
    ),
    // Override risk score to use Privileged User Monitoring color scheme
    [ASSET_FIELDS.ENTITY_RISK]: (props: EuiDataGridCellValueElementProps) => (
      <RiskScoreCellRenderer {...props} rows={rows} />
    ),
  });
};

interface GroupWithURLPaginationProps {
  state: AssetInventoryURLStateResult;
  selectedGroup: string;
  selectedGroupOptions: string[];
  groupSelectorComponent?: JSX.Element;
  additionalCustomRenderers?: (rows: DataTableRecord[]) => CustomCellRenderer;
  height?: number;
}

const GroupWithURLPagination = ({
  state,
  selectedGroup,
  selectedGroupOptions,
  groupSelectorComponent,
  additionalCustomRenderers,
  height,
}: GroupWithURLPaginationProps) => {
  const { groupData, grouping, isFetching } = useAssetInventoryGrouping({
    state: {
      ...state,
      pageIndex: state.pageIndex ?? 0,
      pageSize: state.pageSize ?? 10,
    },
    selectedGroup,
    groupFilters: [],
  });

  useEffect(() => {
    state.onChangePage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  return (
    <GroupWrapper
      data={groupData}
      grouping={grouping}
      renderChildComponent={(currentGroupFilters) => (
        <GroupContent
          currentGroupFilters={currentGroupFilters}
          state={state}
          groupingLevel={1}
          selectedGroupOptions={selectedGroupOptions}
          groupSelectorComponent={groupSelectorComponent}
          additionalCustomRenderers={additionalCustomRenderers}
          height={height}
        />
      )}
      activePageIndex={state.pageIndex}
      pageSize={state.pageSize}
      onChangeGroupsPage={state.onChangePage}
      onChangeGroupsItemsPerPage={state.onChangeItemsPerPage}
      isFetching={isFetching}
      selectedGroup={selectedGroup}
      groupingLevel={0}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

interface GroupContentProps {
  currentGroupFilters: Filter[];
  state: AssetInventoryURLStateResult;
  groupingLevel: number;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  groupSelectorComponent?: JSX.Element;
  additionalCustomRenderers?: (rows: DataTableRecord[]) => CustomCellRenderer;
  height?: number;
}

const groupFilterMap = (filter: Filter | null): Filter | null => {
  const query = filter?.query;
  if (query?.bool?.should?.[0]?.bool?.must_not?.exists?.field === ASSET_FIELDS.ASSET_CRITICALITY) {
    return {
      meta: filter?.meta ?? { alias: null, disabled: false, negate: false },
      query: {
        bool: {
          filter: {
            bool: {
              should: [
                { term: { [ASSET_FIELDS.ASSET_CRITICALITY]: 'deleted' } },
                { bool: { must_not: { exists: { field: ASSET_FIELDS.ASSET_CRITICALITY } } } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    };
  }
  return query?.match_phrase || query?.bool?.should || query?.bool?.filter ? filter : null;
};

const filterTypeGuard = (filter: Filter | null): filter is Filter => filter !== null;

const mergeCurrentAndParentFilters = (
  currentGroupFilters: Filter[],
  parentGroupFilters: string | undefined
) => {
  return [...currentGroupFilters, ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : [])];
};

const GroupContent = ({
  currentGroupFilters,
  state,
  groupingLevel,
  selectedGroupOptions,
  parentGroupFilters,
  groupSelectorComponent,
  additionalCustomRenderers,
  height,
}: GroupContentProps) => {
  if (groupingLevel < selectedGroupOptions.length) {
    const nextGroupingLevel = groupingLevel + 1;

    const newParentGroupFilters = mergeCurrentAndParentFilters(
      currentGroupFilters,
      parentGroupFilters
    )
      .map(groupFilterMap)
      .filter(filterTypeGuard);

    return (
      <GroupWithLocalPagination
        state={state}
        groupingLevel={nextGroupingLevel}
        selectedGroup={selectedGroupOptions[groupingLevel]}
        selectedGroupOptions={selectedGroupOptions}
        parentGroupFilters={JSON.stringify(newParentGroupFilters)}
        groupSelectorComponent={groupSelectorComponent}
        additionalCustomRenderers={additionalCustomRenderers}
        height={height}
      />
    );
  }

  return (
    <DataTableWithLocalPagination
      state={state}
      currentGroupFilters={currentGroupFilters}
      parentGroupFilters={parentGroupFilters}
      additionalCustomRenderers={additionalCustomRenderers}
      height={height}
    />
  );
};

interface GroupWithLocalPaginationProps extends GroupWithURLPaginationProps {
  groupingLevel: number;
  parentGroupFilters?: string;
}

const GroupWithLocalPagination = ({
  state,
  groupingLevel,
  parentGroupFilters,
  selectedGroup,
  selectedGroupOptions,
  groupSelectorComponent,
  additionalCustomRenderers,
  height,
}: GroupWithLocalPaginationProps) => {
  const [subgroupPageIndex, setSubgroupPageIndex] = useState(0);
  const [subgroupPageSize, setSubgroupPageSize] = useState(10);

  const groupFilters = parentGroupFilters ? JSON.parse(parentGroupFilters) : [];

  const { groupData, grouping, isFetching } = useAssetInventoryGrouping({
    state: { ...state, pageIndex: subgroupPageIndex, pageSize: subgroupPageSize },
    selectedGroup,
    groupFilters,
  });

  useEffect(() => {
    setSubgroupPageIndex(0);
  }, [selectedGroup]);

  return (
    <GroupWrapper
      data={groupData}
      grouping={grouping}
      renderChildComponent={(currentGroupFilters) => (
        <GroupContent
          currentGroupFilters={currentGroupFilters.map(groupFilterMap).filter(filterTypeGuard)}
          state={state}
          groupingLevel={groupingLevel}
          selectedGroupOptions={selectedGroupOptions}
          groupSelectorComponent={groupSelectorComponent}
          parentGroupFilters={JSON.stringify(groupFilters)}
          additionalCustomRenderers={additionalCustomRenderers}
          height={height}
        />
      )}
      activePageIndex={subgroupPageIndex}
      pageSize={subgroupPageSize}
      onChangeGroupsPage={setSubgroupPageIndex}
      onChangeGroupsItemsPerPage={setSubgroupPageSize}
      isFetching={isFetching}
      selectedGroup={selectedGroup}
      groupingLevel={groupingLevel}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

interface DataTableWithLocalPagination {
  state: AssetInventoryURLStateResult;
  currentGroupFilters: Filter[];
  parentGroupFilters?: string;
  additionalCustomRenderers?: (rows: DataTableRecord[]) => CustomCellRenderer;
  height?: number;
}

const getDataGridFilter = (filter: Filter | null) => {
  if (!filter) return null;
  return {
    ...(filter?.query ?? {}),
  };
};

const DataTableWithLocalPagination = ({
  state,
  currentGroupFilters,
  parentGroupFilters,
  additionalCustomRenderers,
  height,
}: DataTableWithLocalPagination) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const combinedFilters = mergeCurrentAndParentFilters(currentGroupFilters, parentGroupFilters)
    .map(groupFilterMap)
    .filter(filterTypeGuard)
    .map(getDataGridFilter)
    .filter((filter): filter is NonNullable<Filter['query']> => Boolean(filter));

  const newState: AssetInventoryURLStateResult = {
    ...state,
    query: {
      ...state.query,
      bool: {
        ...state.query.bool,
        filter: [...state.query.bool.filter, ...combinedFilters],
      },
    },
    pageIndex: tablePageIndex,
    pageSize: tablePageSize,
    onChangePage: setTablePageIndex,
    onChangeItemsPerPage: setTablePageSize,
  };

  return (
    <AssetInventoryDataTable
      state={newState}
      height={height ?? DEFAULT_TABLE_SECTION_HEIGHT}
      additionalCustomRenderers={additionalCustomRenderers}
    />
  );
};

export const ThreatHuntingEntitiesTable: React.FC<ThreatHuntingEntitiesTableProps> = ({
  state,
  height,
}) => {
  // Get grouping functionality for "Group assets by" feature
  const { grouping } = useAssetInventoryGrouping({
    state: {
      ...state,
      // Ensure pageIndex and pageSize are defined to prevent null values in grouping query
      pageIndex: state.pageIndex ?? 0,
      pageSize: state.pageSize ?? 10,
    },
  });

  const selectedGroup = grouping.selectedGroups[0];

  // Create custom cell renderers that extend the base ones
  const additionalCustomRenderers = useMemo(() => createThreatHuntingCustomRenderers(), []);

  // When no group is selected, show plain table with group selector
  if (selectedGroup === 'none') {
    return (
      <AssetInventoryDataTable
        state={state}
        height={height}
        additionalCustomRenderers={additionalCustomRenderers}
        groupSelectorComponent={grouping.groupSelector}
      />
    );
  }

  // When a group is selected, show grouped view
  return (
    <GroupWithURLPagination
      state={state}
      selectedGroup={selectedGroup}
      selectedGroupOptions={grouping.selectedGroups}
      groupSelectorComponent={grouping.groupSelector}
      additionalCustomRenderers={additionalCustomRenderers}
      height={height}
    />
  );
};
