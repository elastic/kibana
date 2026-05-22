/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityIconByType } from '../../../../entity_analytics/components/entity_store/helpers';
import { EntitySourceBadge } from '../../../../flyout/entity_details/shared/components/entity_source_badge';
import { RiskLevelBadge } from '../../../../flyout/entity_details/shared/components/risk_level_badge';
import { AssetCriticalityBadge } from '../../../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import type { RiskSeverity } from '../../../../../common/search_strategy';

const ENTITY_TYPE_LABEL: Record<EntityType, string> = {
  [EntityType.host]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.host',
    { defaultMessage: 'Host' }
  ),
  [EntityType.user]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.user',
    { defaultMessage: 'User' }
  ),
  [EntityType.service]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.service',
    { defaultMessage: 'Service' }
  ),
  [EntityType.generic]: i18n.translate(
    'xpack.securitySolution.agentBuilder.entityAttachment.entityType.generic',
    { defaultMessage: 'Entity' }
  ),
};

interface IdentityHeaderProps {
  displayName: string;
  entityType: EntityType;
  isEntityInStore: boolean;
  hasLastSeenDate: boolean;
  assetCriticality?: CriticalityLevelWithUnassigned;
  riskLevel?: RiskSeverity;
}

export const IdentityHeader: React.FC<IdentityHeaderProps> = ({
  displayName,
  entityType,
  isEntityInStore,
  hasLastSeenDate,
  assetCriticality,
  riskLevel,
}) => {
  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      data-test-subj="entityAttachmentIdentityHeader"
    >
      <EuiFlexItem grow={false}>
        <EuiAvatar
          name={displayName}
          iconType={EntityIconByType[entityType]}
          color="subdued"
          size="m"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          <strong data-test-subj="entityAttachmentIdentityName">{displayName}</strong>
        </EuiText>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="entityAttachmentTypeBadge">
              {ENTITY_TYPE_LABEL[entityType]}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EntitySourceBadge
              isEntityInStore={isEntityInStore}
              hasLastSeenDate={hasLastSeenDate}
              data-test-subj="entityAttachmentSourceBadge"
            />
          </EuiFlexItem>
          {riskLevel && (
            <EuiFlexItem grow={false} data-test-subj="entityAttachmentRiskLevelBadge">
              <RiskLevelBadge riskLevel={riskLevel} />
            </EuiFlexItem>
          )}
          {assetCriticality && assetCriticality !== 'unassigned' && (
            <EuiFlexItem grow={false}>
              <AssetCriticalityBadge
                criticalityLevel={assetCriticality}
                dataTestSubj="entityAttachmentCriticalityBadge"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
