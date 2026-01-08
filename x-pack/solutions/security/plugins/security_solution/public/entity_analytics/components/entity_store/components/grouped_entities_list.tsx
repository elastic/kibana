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
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useEntityStoreTypes } from '../../../hooks/use_enabled_entity_types';
import { RiskScoreLevel } from '../../severity/common';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import type {
  EntityGroup as ApiEntityGroup,
  GroupedEntity,
} from '../../../../../common/api/entity_analytics/entity_store/resolution/list_grouped_entities.gen';

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
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.errorTitle',
          { defaultMessage: 'Error loading entities' }
        )}
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
        title={i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.emptyTitle',
          { defaultMessage: 'No entities found' }
        )}
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
}

const EntityGroupAccordion: React.FC<EntityGroupAccordionProps> = ({
  group,
  isExpanded,
  onToggle,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'entityGroup' });

  const columns: Array<EuiBasicTableColumn<GroupedEntity>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.columns.name',
          { defaultMessage: 'Name' }
        ),
        render: (_: unknown, item: GroupedEntity) => item.name ?? '-',
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
        name: i18n.translate(
          'xpack.securitySolution.entityAnalytics.groupedEntities.columns.id',
          { defaultMessage: 'ID' }
        ),
        render: (_: unknown, item: GroupedEntity) => (
          <EuiText size="xs" color="subdued">
            {item.id}
          </EuiText>
        ),
      },
    ],
    []
  );

  const primaryEntityName = group.entities[0]?.name ?? 'Unknown';
  const isSingleEntity = group.entities.length === 1;

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
              <EuiText size="s">
                <strong>{primaryEntityName}</strong>
                {!isSingleEntity && (
                  <span style={{ color: '#69707d' }}> + {group.entities.length - 1} more</span>
                )}
              </EuiText>
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
