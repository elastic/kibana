/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  useEuiTheme,
  EuiBadge,
  EuiText,
  EuiIcon,
  EuiLoadingSpinner,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { noop, get } from 'lodash/fp';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { SecurityPageName, useNavigation } from '@kbn/security-solution-navigation';
import { encode } from '@kbn/rison';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { Direction } from '../../../../common/search_strategy/common';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import type { Criteria, Columns } from '../../../explore/components/paginated_table';
import { PaginatedTable } from '../../../explore/components/paginated_table';
import { EntityType, EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import {
  EntityTypeToLevelField,
  EntityTypeToScoreField,
  RiskSeverity,
} from '../../../../common/search_strategy';
import { getRiskLevel } from '../../../../common/entity_analytics/risk_engine';
import { useInvestigateInTimeline } from '../../../common/hooks/timeline/use_investigate_in_timeline';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { createDataProviders } from '../../../app/actions/add_to_timeline/data_provider';
import { formatRiskScoreWholeNumber } from '../../common/utils';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { useEntitiesListQuery } from '../entity_store/hooks/use_entities_list_query';
import { useEntitiesListFilters } from '../entity_store/hooks/use_entities_list_filters';
import { useEntityStoreTypes } from '../../hooks/use_enabled_entity_types';
import type { Entity } from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import type { CriticalityLevels } from '../../../../common/constants';
import type { EntitySourceTag } from '../entity_store/types';
import { EntityIconByType, getEntityType, sourceFieldToText } from '../entity_store/helpers';
import { CRITICALITY_LEVEL_TITLE } from '../asset_criticality/translations';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { RiskScoreLevel } from '../severity/common';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../flyout/entity_details/shared/constants';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import type { AlertsByStatusAgg } from '../../../overview/components/detection_response/alerts_by_status/types';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
import {
  getAlertsByStatusQuery,
  parseAlertsData,
} from '../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { formatPageFilterSearchParam } from '../../../../common/utils/format_page_filter_search_param';
import { URL_PARAM_KEY } from '../../../common/hooks/constants';
import {
  OPEN_IN_ALERTS_TITLE_STATUS,
  OPEN_IN_ALERTS_TITLE_USERNAME,
  OPEN_IN_ALERTS_TITLE_HOSTNAME,
} from '../../../overview/components/detection_response/translations';
import { FILTER_ACKNOWLEDGED, FILTER_OPEN } from '../../../../common/types';
import { getFormattedAlertStats } from '../../../flyout/document_details/shared/components/alert_count_insight';

const THREAT_HUNTING_TABLE_ID = 'threat-hunting-table';

/**
 * Creates data providers for timeline investigation based on entity type and name
 */
const createEntityDataProviders = (
  entityType: EntityType | undefined,
  entityName: string | undefined
) => {
  if (!entityName || !entityType) {
    return null;
  }

  // Map entity type to the appropriate field name, fallback to 'entity.id' if not found
  const fieldName: string = EntityTypeToIdentifierField[entityType] || 'entity.id';

  const dataProviders = createDataProviders({
    contextId: THREAT_HUNTING_TABLE_ID,
    field: fieldName,
    values: entityName,
  });

  return dataProviders;
};

/**
 * Helper function to get risk score colors based on risk level
 */
const getRiskScoreColors = (
  level: RiskSeverity,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme']
): { background: string; text: string } => {
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
  }
};

const EntityAlertDistribution: React.FC<{ entityType: EntityType; entityName: string }> = ({
  entityType,
  entityName,
}) => {
  const { signalIndexName } = useSignalIndex();
  const { from, to } = useGlobalTime();
  const { euiTheme } = useEuiTheme();

  const fieldName = EntityTypeToIdentifierField[entityType] || 'entity.id';

  const { data, setQuery: setAlertsQuery } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: getAlertsByStatusQuery({
      from,
      to,
      entityFilter: { field: fieldName, value: entityName },
    }),
    indexName: signalIndexName,
    queryName: ALERTS_QUERY_NAMES.BY_STATUS,
  });

  useEffect(() => {
    setAlertsQuery(
      getAlertsByStatusQuery({
        from,
        to,
        entityFilter: { field: fieldName, value: entityName },
      })
    );
  }, [setAlertsQuery, from, to, fieldName, entityName]);

  const { navigateTo } = useNavigation();

  if (!data) return <EuiLoadingSpinner size="m" />;

  const alertsData = parseAlertsData(data);
  const alertStats = getFormattedAlertStats(alertsData, euiTheme);

  const alertCount = (alertsData?.open?.total ?? 0) + (alertsData?.acknowledged?.total ?? 0);

  const timerange = encode({
    global: {
      [URL_PARAM_KEY.timerange]: {
        kind: 'absolute',
        from,
        to,
      },
    },
  });

  const titleForEntity =
    entityType === EntityType.host ? OPEN_IN_ALERTS_TITLE_HOSTNAME : OPEN_IN_ALERTS_TITLE_USERNAME;

  const filters = [
    {
      title: titleForEntity,
      selected_options: [entityName],
      field_name: fieldName,
    },
    {
      title: OPEN_IN_ALERTS_TITLE_STATUS,
      selected_options: [FILTER_OPEN, FILTER_ACKNOWLEDGED],
      field_name: 'kibana.alert.workflow_status',
    },
  ];

  const urlFilterParams = encode(formatPageFilterSearchParam(filters));
  const timerangePath = timerange ? `&timerange=${timerange}` : '';

  const openAlertsPage = () => {
    navigateTo({
      deepLinkId: SecurityPageName.alerts,
      path: `?${URL_PARAM_KEY.pageFilter}=${urlFilterParams}${timerangePath}`,
      openInNewTab: true,
    });
  };

  return (
    <EuiFlexGroup direction="row">
      <EuiFlexItem>
        <DistributionBar
          stats={alertStats}
          hideLastTooltip
          data-test-subj="threat-hunting-alerts-distribution-bar"
        />
      </EuiFlexItem>
      <EuiBadge color="hollow">{<EuiLink onClick={openAlertsPage}>{alertCount}</EuiLink>}</EuiBadge>
    </EuiFlexGroup>
  );
};

export type ThreatHuntingEntitiesColumns = [
  Columns<Entity>,
  Columns<string, Entity>,
  Columns<string | undefined, Entity>,
  Columns<CriticalityLevels, Entity>,
  Columns<Entity>,
  Columns<Entity>,
  Columns<Entity>,
  Columns<string, Entity>
];

const useThreatHuntingColumns = (): ThreatHuntingEntitiesColumns => {
  const { euiTheme } = useEuiTheme();
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();
  const { openRightPanel } = useExpandableFlyoutApi();

  return [
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.actionsColumn.title"
          defaultMessage="Actions"
        />
      ),
      render: (record: Entity) => {
        const entityType = getEntityType(record);
        const entityName = record.entity.name;

        const handleFlyoutClick = () => {
          const id = EntityPanelKeyByType[entityType];

          if (id && entityName) {
            openRightPanel({
              id,
              params: {
                [EntityPanelParamByType[entityType] ?? '']: entityName,
                contextID: THREAT_HUNTING_TABLE_ID,
                scopeId: THREAT_HUNTING_TABLE_ID,
              },
            });
          }
        };

        const handleTimelineClick = () => {
          const dataProviders = createEntityDataProviders(entityType, entityName);
          if (dataProviders && dataProviders.length > 0) {
            investigateInTimeline({
              dataProviders,
            });
          }
        };

        if (!entityName) {
          return null;
        }

        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            {EntityPanelKeyByType[entityType] && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.securitySolution.entityAnalytics.threatHunting.entityPreview.tooltip',
                    {
                      defaultMessage: 'Preview entity',
                    }
                  )}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="expand"
                    onClick={handleFlyoutClick}
                    aria-label={i18n.translate(
                      'xpack.securitySolution.entityAnalytics.threatHunting.entityPreview.ariaLabel',
                      {
                        defaultMessage: 'Preview entity with name {name}',
                        values: { name: entityName },
                      }
                    )}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
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
          </EuiFlexGroup>
        );
      },
      width: '5%',
    },
    {
      field: 'entity.name',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.nameColumn.title"
          defaultMessage="Name"
        />
      ),
      sortable: true,
      truncateText: { lines: 2 },
      render: (_: string, record: Entity) => {
        const entityType = getEntityType(record);
        const entityName = record.entity.name;

        return (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <EuiIcon type={EntityIconByType[entityType]} aria-label={`${entityType} entity`} />
            <span css={{ paddingLeft: euiTheme.size.s }}>{entityName}</span>
          </span>
        );
      },
      width: '20%',
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.riskScoreColumn.title"
          defaultMessage="Risk score"
        />
      ),
      width: '10%',
      render: (entity: Entity) => {
        const entityType = getEntityType(entity);

        // Get risk score using EntityTypeToScoreField
        const riskScore = get(EntityTypeToScoreField[entityType], entity) as number | undefined;

        // Get risk level using EntityTypeToLevelField
        const riskLevel = get(EntityTypeToLevelField[entityType], entity) as
          | RiskSeverity
          | undefined;

        // If we have neither risk score nor risk level, show empty
        if ((riskScore === undefined || riskScore === null) && !riskLevel) {
          return getEmptyTagValue();
        }

        // Determine risk level from risk score if not directly available
        const level =
          riskLevel || (riskScore != null ? getRiskLevel(riskScore) : RiskSeverity.Unknown);

        const colors = getRiskScoreColors(level, euiTheme);

        return (
          <EuiBadge color={colors.background}>
            <EuiText
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size={'s'}
              color={colors.text}
            >
              {riskScore !== undefined && riskScore !== null
                ? formatRiskScoreWholeNumber(riskScore)
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.threatHunting.riskScore.na',
                    {
                      defaultMessage: 'N/A',
                    }
                  )}
            </EuiText>
          </EuiBadge>
        );
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.riskLevelColumn.title"
          defaultMessage="Risk Level"
        />
      ),
      width: '10%',
      render: (entity: Entity) => {
        const entityType = getEntityType(entity);
        const riskLevel = get(EntityTypeToLevelField[entityType], entity) as
          | RiskSeverity
          | undefined;

        if (riskLevel != null) {
          return <RiskScoreLevel severity={riskLevel} />;
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'asset.criticality',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.criticalityColumn.title"
          defaultMessage="Asset Criticality"
        />
      ),
      width: '10%',
      render: (criticality: CriticalityLevels) => {
        if (criticality != null) {
          return <span>{CRITICALITY_LEVEL_TITLE[criticality]}</span>;
        }
        return getEmptyTagValue();
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.alertsColumn.title"
          defaultMessage="Alerts"
        />
      ),
      render: (entity: Entity) => {
        const entityType = getEntityType(entity);
        const entityName = entity.entity.name;
        if (!entityName) return getEmptyTagValue();
        return <EntityAlertDistribution entityType={entityType} entityName={entityName} />;
      },
    },
    {
      field: 'entity.source',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.sourceColumn.title"
          defaultMessage="Source"
        />
      ),
      width: '15%',
      truncateText: { lines: 2 },
      render: (source: string | undefined) => {
        if (source != null) {
          return sourceFieldToText(source);
        }
        return getEmptyTagValue();
      },
    },
    {
      field: '@timestamp',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.threatHunting.lastUpdateColumn.title"
          defaultMessage="Last Seen"
        />
      ),
      sortable: true,
      render: (lastSeen: string) => {
        return <FormattedRelativePreferenceDate value={lastSeen} />;
      },
      width: '15%',
    },
  ];
};

export const ThreatHuntingEntitiesTable: React.FC = () => {
  const { deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const [activePage, setActivePage] = useState(0);
  const [limit, setLimit] = useState(10);
  const { toggleStatus } = useQueryToggle(THREAT_HUNTING_TABLE_ID);
  const [sorting, setSorting] = useState({
    field: '@timestamp',
    direction: Direction.desc,
  });
  const entityTypes = useEntityStoreTypes();
  const [selectedSeverities, _setSelectedSeverities] = useState<RiskSeverity[]>([]);
  const [selectedCriticalities, _setSelectedCriticalities] = useState<CriticalityLevels[]>([]);
  const [selectedSources, _setSelectedSources] = useState<EntitySourceTag[]>([]);

  const filter = useEntitiesListFilters({
    selectedSeverities,
    selectedCriticalities,
    selectedSources,
  });

  const [querySkip, setQuerySkip] = useState(isInitializing || !toggleStatus);
  useEffect(() => {
    setQuerySkip(isInitializing || !toggleStatus);
  }, [isInitializing, toggleStatus]);

  const onSort = useCallback(
    (criteria: Criteria) => {
      if (criteria.sort != null) {
        const newSort = criteria.sort;
        if (newSort.direction !== sorting.direction || newSort.field !== sorting.field) {
          setSorting(newSort);
        }
      }
    },
    [sorting]
  );

  const searchParams = useMemo(
    () => ({
      entityTypes,
      page: activePage + 1,
      perPage: limit,
      sortField: sorting.field,
      sortOrder: sorting.direction,
      skip: querySkip,
      filterQuery: JSON.stringify({
        bool: {
          filter,
        },
      }),
    }),
    [entityTypes, activePage, limit, sorting.field, sorting.direction, querySkip, filter]
  );
  const { data, isLoading, isRefetching, refetch, error } = useEntitiesListQuery(searchParams);

  useQueryInspector({
    queryId: THREAT_HUNTING_TABLE_ID,
    loading: isLoading || isRefetching,
    refetch,
    setQuery,
    deleteQuery,
    inspect: data?.inspect ?? null,
  });

  // Reset the active page when the search criteria changes
  useEffect(() => {
    setActivePage(0);
  }, [sorting, limit, filter]);

  const columns = useThreatHuntingColumns();

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.threatHunting.queryError', {
      defaultMessage: 'There was an error loading the entities list',
    }),
    error
  );

  return (
    <PaginatedTable
      id={THREAT_HUNTING_TABLE_ID}
      dataTestSubj="threat-hunting-entities-table"
      activePage={activePage}
      columns={columns}
      headerCount={data?.total ?? 0}
      titleSize="s"
      headerTitle={i18n.translate(
        'xpack.securitySolution.entityAnalytics.threatHunting.tableTitle',
        {
          defaultMessage: 'Entities',
        }
      )}
      headerTooltip={i18n.translate(
        'xpack.securitySolution.entityAnalytics.threatHunting.tableTooltip',
        {
          defaultMessage: 'Entity data can take a couple of minutes to appear',
        }
      )}
      limit={limit}
      loading={isLoading || isRefetching}
      isInspect={false}
      updateActivePage={setActivePage}
      loadPage={noop}
      pageOfItems={data?.records ?? []}
      setQuerySkip={setQuerySkip}
      showMorePagesIndicator={false}
      updateLimitPagination={setLimit}
      totalCount={data?.total ?? 0}
      itemsPerRow={[
        {
          text: i18n.translate('xpack.securitySolution.entityAnalytics.threatHunting.rows', {
            values: { numRows: 10 },
            defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
          }),
          numberOfRow: 10,
        },
        {
          text: i18n.translate('xpack.securitySolution.entityAnalytics.threatHunting.rows', {
            values: { numRows: 25 },
            defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
          }),
          numberOfRow: 25,
        },
      ]}
      sorting={sorting}
      onChange={onSort}
    />
  );
};
