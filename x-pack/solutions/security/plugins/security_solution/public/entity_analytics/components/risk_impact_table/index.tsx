/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiBadge,
  EuiHealth,
  EuiLink,
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { getRiskScoreColors } from '../entity_analytics_risk_score/utils';

export interface RiskImpactEntity {
  entityName: string;
  entityType: 'service' | 'host' | 'user';
  riskScore: number;
  riskLevel: RiskSeverity;
  impactedSLOs: number;
  projectedBreach: string;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
}

interface RiskImpactTableProps {
  entities: RiskImpactEntity[];
  loading?: boolean;
  onEntityClick: (entity: RiskImpactEntity) => void;
}

export const RiskImpactTable: React.FC<RiskImpactTableProps> = ({
  entities,
  loading = false,
  onEntityClick,
}) => {
  const handleRowClick = useCallback(
    (entity: RiskImpactEntity) => {
      onEntityClick(entity);
    },
    [onEntityClick]
  );

  const columns: Array<EuiBasicTableColumn<RiskImpactEntity>> = useMemo(
    () => [
      {
        field: 'entityName',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.riskImpact.table.entityName"
            defaultMessage="Entity Name"
          />
        ),
        render: (entityName: string, entity: RiskImpactEntity) => (
          <EuiLink
            onClick={() => handleRowClick(entity)}
            data-test-subj={`risk-impact-entity-${entityName}`}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={getEntityIcon(entity.entityType)} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{entityName}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        ),
        sortable: true,
        width: '25%',
      },
      {
        field: 'entityType',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.riskImpact.table.entityType"
            defaultMessage="Type"
          />
        ),
        render: (entityType: string) => (
          <EuiBadge color="hollow">{entityType.toUpperCase()}</EuiBadge>
        ),
        sortable: true,
        width: '10%',
      },
      {
        field: 'riskScore',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.riskImpact.table.riskScore"
            defaultMessage="Risk Score"
          />
        ),
        render: (riskScore: number, entity: RiskImpactEntity) => {
          const colors = getRiskScoreColors(entity.riskLevel);
          return (
            <EuiHealth color={colors.color}>
              <strong>{riskScore != null ? riskScore.toFixed(1) : 'N/A'}</strong>
            </EuiHealth>
          );
        },
        sortable: true,
        width: '12%',
      },
      {
        field: 'riskLevel',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.riskImpact.table.riskLevel"
            defaultMessage="Risk Level"
          />
        ),
        render: (riskLevel: RiskSeverity) => {
          const colors = getRiskScoreColors(riskLevel);
          return <EuiBadge color={colors.badgeColor}>{riskLevel.toUpperCase()}</EuiBadge>;
        },
        sortable: true,
        width: '12%',
      },
      {
        field: 'impactedSLOs',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.riskImpact.table.impactedSLOs"
            defaultMessage="Impacted SLOs"
          />
        ),
        render: (count: number) => (
          <EuiBadge color={count > 0 ? 'danger' : 'default'}>{count}</EuiBadge>
        ),
        sortable: true,
        width: '13%',
      },
      {
        field: 'projectedBreach',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.riskImpact.table.projectedBreach"
            defaultMessage="Projected Breach"
          />
        ),
        render: (projectedBreach: string) => (
          <EuiText size="s" color={projectedBreach !== 'None' ? 'danger' : 'subdued'}>
            {projectedBreach}
          </EuiText>
        ),
        sortable: true,
        width: '15%',
      },
      {
        field: 'criticality',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.riskImpact.table.criticality"
            defaultMessage="Business Impact"
          />
        ),
        render: (criticality: string) => {
          const color = getCriticalityColor(criticality);
          return <EuiBadge color={color}>{criticality}</EuiBadge>;
        },
        sortable: true,
        width: '13%',
      },
    ],
    [handleRowClick]
  );

  const sorting = {
    sort: {
      field: 'riskScore' as keyof RiskImpactEntity,
      direction: 'desc' as const,
    },
  };

  return (
    <EuiInMemoryTable
      items={entities}
      columns={columns}
      pagination={{
        initialPageSize: 10,
        pageSizeOptions: [10, 25, 50],
      }}
      sorting={sorting}
      loading={loading}
      data-test-subj="risk-impact-table"
      tableLayout="auto"
    />
  );
};

const getEntityIcon = (entityType: string): string => {
  switch (entityType) {
    case 'service':
      return 'cloudDrizzle';
    case 'host':
      return 'storage';
    case 'user':
      return 'user';
    default:
      return 'questionInCircle';
  }
};

const getCriticalityColor = (criticality: string): string => {
  switch (criticality.toLowerCase()) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'medium':
      return 'default';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};
