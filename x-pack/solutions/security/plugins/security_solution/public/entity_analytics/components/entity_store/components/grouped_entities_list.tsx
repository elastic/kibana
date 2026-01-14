/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiBasicTable,
  EuiButtonIcon,
  EuiToolTip,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useEntityStoreTypes } from '../../../hooks/use_enabled_entity_types';
import { RiskScoreLevel } from '../../severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import type {
  EntityGroup as ApiEntityGroup,
  GroupedEntity,
} from '../../../../../common/api/entity_analytics/entity_store/resolution/list_grouped_entities.gen';
import {
  EntityPanelKeyByType,
  EntityPanelParamByType,
} from '../../../../flyout/entity_details/shared/constants';
import { EntityType } from '../../../../../common/entity_analytics/types';

const GROUPED_ENTITIES_TABLE_ID = 'grouped-entities-list';

/**
 * Maps entity type strings from the API to EntityType enum values.
 * Some entity types (like "Identity" from CSP data) need to be mapped to
 * the standard EntityType values that have flyout panel support.
 */
const mapToEntityType = (entityType: string): EntityType | null => {
  // Direct match with EntityType enum
  if (entityType in EntityType) {
    return entityType as EntityType;
  }

  // Map alternative type names to EntityType
  const typeMapping: Record<string, EntityType> = {
    Identity: EntityType.user, // Identity entities are typically users
  };

  return typeMapping[entityType] ?? null;
};

interface DisplayEntityGroup {
  id: string;
  resolutionId: string | null;
  entities: GroupedEntity[];
  isLinked: boolean;
  maxRiskScore: number;
  maxRiskLevel?: RiskSeverity;
}

export const GroupedEntitiesList: React.FC = () => {
  const entityTypes = useEntityStoreTypes();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { fetchListGroupedEntities } = useEntityAnalyticsRoutes();
  const { openRightPanel } = useExpandableFlyoutApi();

  const handleOpenFlyout = useCallback(
    (entityName: string, entityType: string) => {
      // Map entity type string to EntityType enum value
      const mappedType = mapToEntityType(entityType);

      if (!mappedType) {
        return;
      }

      const panelKey = EntityPanelKeyByType[mappedType];
      const paramKey = EntityPanelParamByType[mappedType];

      if (panelKey && paramKey && entityName) {
        openRightPanel({
          id: panelKey,
          params: {
            [paramKey]: entityName,
            contextID: GROUPED_ENTITIES_TABLE_ID,
            scopeId: GROUPED_ENTITIES_TABLE_ID,
          },
        });
      }
    },
    [openRightPanel]
  );

  const {
    data: groupedData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['list-grouped-entities', entityTypes],
    queryFn: async () => {
      if (entityTypes.length === 0) return { groups: [], total_groups: 0, total_entities: 0 };
      const result = await fetchListGroupedEntities({
        entityType: entityTypes[0],
        limit: 100,
      });
      return result;
    },
    enabled: entityTypes.length > 0,
    staleTime: 30000,
  });

  const displayGroups: DisplayEntityGroup[] = useMemo(() => {
    if (!groupedData?.groups) return [];

    return groupedData.groups.map((group: ApiEntityGroup) => ({
      id: group.group_id,
      resolutionId: group.resolution_id ?? null,
      entities: group.entities,
      isLinked: group.is_resolved && group.entities.length > 1,
      maxRiskScore: group.max_risk_score ?? 0,
      maxRiskLevel: group.max_risk_level as RiskSeverity | undefined,
    }));
  }, [groupedData?.groups]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.securitySolution.entityAnalytics.groupedEntities.errorTitle', {
          defaultMessage: 'Error loading entities',
        })}
        color="danger"
        iconType="error"
      >
        <p>{String(error)}</p>
      </EuiCallOut>
    );
  }

  if (displayGroups.length === 0) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.securitySolution.entityAnalytics.groupedEntities.emptyTitle', {
          defaultMessage: 'No entities found',
        })}
        color="primary"
        iconType="iInCircle"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.groupedEntities.emptyDescription"
            defaultMessage="There are no entities in the entity store yet."
          />
        </p>
      </EuiCallOut>
    );
  }

  const linkedCount = displayGroups.filter((g) => g.isLinked).length;
  const totalEntities = groupedData?.total_entities ?? 0;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.groupedEntities.summary"
            defaultMessage="{totalEntities} entities in {groupCount} groups ({linkedCount} resolved)"
            values={{
              totalEntities,
              groupCount: displayGroups.length,
              linkedCount,
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        {displayGroups.map((group) => (
          <EntityGroupAccordion
            key={group.id}
            group={group}
            isExpanded={expandedGroups.has(group.id)}
            onToggle={() => toggleGroup(group.id)}
            onOpenFlyout={handleOpenFlyout}
          />
        ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface EntityGroupAccordionProps {
  group: DisplayEntityGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenFlyout: (entityName: string, entityType: string) => void;
}

const EntityGroupAccordion: React.FC<EntityGroupAccordionProps> = ({
  group,
  isExpanded,
  onToggle,
  onOpenFlyout,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'entityGroup' });

  const columns: Array<EuiBasicTableColumn<GroupedEntity>> = useMemo(
    () => [
      {
        name: i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.columns.actions',
          { defaultMessage: 'Actions' }
        ),
        width: '60px',
        render: (item: GroupedEntity) => {
          const mappedType = mapToEntityType(item.type);
          const hasPanel = mappedType ? EntityPanelKeyByType[mappedType] : null;

          if (!item.name || !hasPanel) {
            return null;
          }

          return (
            <EuiToolTip
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.groupedEntities.viewEntityTooltip',
                { defaultMessage: 'View entity details' }
              )}
            >
              <EuiButtonIcon
                iconType="expand"
                onClick={() => onOpenFlyout(item.name, item.type)}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.groupedEntities.viewEntity.ariaLabel',
                  {
                    defaultMessage: 'View entity {name}',
                    values: { name: item.name },
                  }
                )}
                data-test-subj={`groupedEntityFlyoutButton-${item.id}`}
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'name',
        name: i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.columns.name',
          { defaultMessage: 'Name' }
        ),
        render: (_: unknown, item: GroupedEntity) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{item.name ?? '-'}</EuiFlexItem>
            {item.is_primary && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning" iconType="starFilled">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.groupedEntities.primaryBadge',
                    { defaultMessage: 'Primary' }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'type',
        name: i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.columns.type',
          { defaultMessage: 'Type' }
        ),
        render: (_: unknown, item: GroupedEntity) => (
          <EuiBadge color="hollow">{item.type ?? '-'}</EuiBadge>
        ),
        width: '100px',
      },
      {
        field: 'risk_score',
        name: i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.columns.riskScore',
          { defaultMessage: 'Risk Score' }
        ),
        render: (_: unknown, item: GroupedEntity) => {
          const score = item.risk_score;
          const level = item.risk_level;
          if (!score && !level) return '-';
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{Math.round(score ?? 0)}</EuiText>
              </EuiFlexItem>
              {level && (
                <EuiFlexItem grow={false}>
                  <RiskScoreLevel severity={level as RiskSeverity} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
        width: '140px',
      },
      {
        field: 'id',
        name: i18n.translate('xpack.securitySolution.entityAnalytics.groupedEntities.columns.id', {
          defaultMessage: 'ID',
        }),
        render: (_: unknown, item: GroupedEntity) => (
          <EuiText size="xs" color="subdued">
            {item.id}
          </EuiText>
        ),
      },
    ],
    [onOpenFlyout]
  );

  const primaryEntity = group.entities[0];
  const primaryEntityName = primaryEntity?.name ?? 'Unknown';
  const isPrimaryEntity = primaryEntity?.is_primary === true;
  const isSingleEntity = group.entities.length === 1;
  const primaryMappedType = primaryEntity?.type ? mapToEntityType(primaryEntity.type) : null;
  const hasPrimaryPanel = primaryMappedType ? EntityPanelKeyByType[primaryMappedType] : null;

  return (
    <EuiPanel paddingSize="s" hasBorder style={{ marginBottom: 8 }}>
      <EuiAccordion
        id={accordionId}
        forceState={isExpanded ? 'open' : 'closed'}
        onToggle={onToggle}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiBadge color={group.isLinked ? 'success' : 'hollow'}>
                {group.entities.length}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{primaryEntityName}</strong>
                    {!isSingleEntity && (
                      <span style={{ color: '#69707d' }}>
                        {' '}
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.groupedEntities.moreEntities',
                          {
                            defaultMessage: '+ {count} more',
                            values: { count: group.entities.length - 1 },
                          }
                        )}
                      </span>
                    )}
                  </EuiText>
                </EuiFlexItem>
                {isPrimaryEntity && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning" iconType="starFilled" iconSide="left">
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.groupedEntities.primaryLabel',
                        { defaultMessage: 'Primary' }
                      )}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {group.maxRiskScore > 0 && (
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">{Math.round(group.maxRiskScore)}</EuiText>
                  </EuiFlexItem>
                  {group.maxRiskLevel && (
                    <EuiFlexItem grow={false}>
                      <RiskScoreLevel severity={group.maxRiskLevel} />
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
              {group.isLinked ? (
                <EuiBadge color="primary">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.groupedEntities.resolvedBadge',
                    { defaultMessage: 'Resolved' }
                  )}
                </EuiBadge>
              ) : (
                <EuiText size="xs" color="subdued">
                  {i18n.translate(
                    'xpack.securitySolution.entityAnalytics.groupedEntities.unresolvedLabel',
                    { defaultMessage: 'Unresolved' }
                  )}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        extraAction={
          primaryEntity?.name && hasPrimaryPanel ? (
            <EuiToolTip
              content={i18n.translate(
                'xpack.securitySolution.entityAnalytics.groupedEntities.viewPrimaryTooltip',
                {
                  defaultMessage: 'View {name}',
                  values: { name: primaryEntityName },
                }
              )}
            >
              <EuiButtonIcon
                iconType="expand"
                onClick={() => onOpenFlyout(primaryEntity.name, primaryEntity.type)}
                aria-label={i18n.translate(
                  'xpack.securitySolution.entityAnalytics.groupedEntities.viewPrimary.ariaLabel',
                  {
                    defaultMessage: 'View primary entity {name}',
                    values: { name: primaryEntityName },
                  }
                )}
                data-test-subj={`groupedEntityHeaderFlyoutButton-${group.id}`}
              />
            </EuiToolTip>
          ) : undefined
        }
        paddingSize="s"
      >
        <EuiSpacer size="s" />
        <EuiBasicTable
          items={group.entities}
          columns={columns}
          tableLayout="auto"
          data-test-subj="groupedEntitiesTable"
        />
        {group.resolutionId && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.groupedEntities.resolutionIdLabel"
                defaultMessage="Resolution ID: {resolutionId}"
                values={{ resolutionId: group.resolutionId }}
              />
            </EuiText>
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};
