/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBasicTable,
  EuiLoadingSpinner,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import type { EntityType, Entity } from '../../../../../../common/api/entity_analytics';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import { useSecondariesQuery } from '../../hooks/use_secondaries_query';
import { useUnlinkEntitiesMutation } from '../../hooks/use_unlink_entities_mutation';
import { RiskScoreLevel } from '../../../severity/common';
import { formatRiskScore } from '../../../../common';
import * as i18n from './translations';

// Risk data interface for type casting entity-type-specific risk fields
interface EntityRiskData {
  risk?: {
    calculated_score_norm?: number;
    calculated_level?: string;
  };
}

interface ExpandedSecondariesPanelProps {
  entityType: EntityType;
  primaryEntityId: string;
}

export const ExpandedSecondariesPanel: React.FC<ExpandedSecondariesPanelProps> = ({
  entityType,
  primaryEntityId,
}) => {
  const { notifications } = useKibana().services;
  const { data, isLoading, error } = useSecondariesQuery({
    entityType,
    primaryEntityId,
    enabled: true,
  });
  const { mutate: unlinkEntity, isLoading: isUnlinking } = useUnlinkEntitiesMutation({
    entityType,
  });

  const handleUnlink = useCallback(
    (entityId: string) => {
      unlinkEntity(
        { entityIds: [entityId] },
        {
          onSuccess: () => {
            notifications?.toasts.addSuccess(i18n.UNLINK_ENTITY_SUCCESS);
          },
          onError: () => {
            notifications?.toasts.addDanger(i18n.UNLINK_ENTITY_ERROR);
          },
        }
      );
    },
    [unlinkEntity, notifications?.toasts]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ padding: 16 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18n.LOADING_SECONDARIES}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        title={i18n.ERROR_LOADING_SECONDARIES}
        iconType="error"
        size="s"
      />
    );
  }

  const secondaries = data?.secondaries ?? [];

  if (secondaries.length === 0) {
    return (
      <EuiCallOut announceOnMount title={i18n.NO_SECONDARIES_FOUND} iconType="iInCircle" size="s" />
    );
  }

  const columns: Array<EuiBasicTableColumn<Entity>> = [
    {
      field: 'entity.name',
      name: i18n.COLUMN_NAME,
      width: '30%',
      render: (_: unknown, item: Entity) => <EuiText size="s">{item.entity?.name ?? '-'}</EuiText>,
    },
    {
      field: 'entity.source',
      name: i18n.COLUMN_SOURCE,
      width: '20%',
      render: (_: unknown, item: Entity) => (
        <EuiText size="s">{item.entity?.source ?? '-'}</EuiText>
      ),
    },
    {
      field:
        entityType === 'user'
          ? 'user.risk.calculated_score_norm'
          : 'host.risk.calculated_score_norm',
      name: i18n.COLUMN_RISK_SCORE,
      width: '15%',
      render: (_: unknown, item: Entity) => {
        // Get risk data from entity-type-specific field (cast to access nested properties)
        const entityData = (
          entityType === 'user'
            ? (item as { user?: EntityRiskData }).user
            : (item as { host?: EntityRiskData }).host
        ) as EntityRiskData | undefined;
        const score = entityData?.risk?.calculated_score_norm;
        const level = entityData?.risk?.calculated_level;
        if (score == null) return '-';
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{formatRiskScore(score)}</EuiText>
            </EuiFlexItem>
            {level && (
              <EuiFlexItem grow={false}>
                <RiskScoreLevel severity={level as RiskSeverity} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: '@timestamp',
      name: i18n.COLUMN_LAST_UPDATE,
      width: '20%',
      render: (timestamp: string) => <FormattedRelativePreferenceDate value={timestamp} />,
    },
    {
      field: 'actions',
      name: i18n.COLUMN_ACTIONS,
      width: '15%',
      render: (_: unknown, item: Entity) => {
        const entityId = item.entity?.id;
        const entityName = item.entity?.name ?? entityId ?? '';
        if (!entityId) return null;
        return (
          <EuiToolTip content={i18n.UNLINK_ENTITY}>
            <EuiButtonIcon
              iconType="unlink"
              aria-label={i18n.UNLINK_ENTITY_ARIA_LABEL(entityName)}
              onClick={() => handleUnlink(entityId)}
              isDisabled={isUnlinking}
              color="danger"
              size="s"
            />
          </EuiToolTip>
        );
      },
    },
  ];

  return (
    <div style={{ paddingLeft: 40, paddingRight: 16, paddingBottom: 16 }}>
      <EuiBasicTable
        items={secondaries}
        columns={columns}
        tableLayout="auto"
        compressed
        tableCaption={i18n.RESOLVED_ENTITIES_TABLE_CAPTION}
      />
    </div>
  );
};
