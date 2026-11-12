/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useMemo } from 'react';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import type { EntityViewMode } from '../../../../../common/entity_analytics/entity_store/resolution_group';
import { EntityIconByType } from '../../../../entity_analytics/components/entity_store/helpers';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { FlyoutHeaderActions } from '../../../shared/components/flyout_header_actions';
import type { FirstLastSeenData } from '../../shared/components/observed_entity/types';
import { EntitySourceBadge } from '../../../../flyout/entity_details/shared/components/entity_source_badge';
import { getResolvedFromRecordCount } from '../../../../flyout/entity_details/shared/entity_store_group_utils';
import type { EntityStoreRecord } from '../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { RiskLevelBadge } from '../../../../flyout/entity_details/shared/components/risk_level_badge';
import { EntityAnalyticsFlyoutCopyLink } from '../../shared/components/entity_analytics_flyout_copy_link';
import { toEntityDescriptorMode } from '../../../shared/url_state/flyout_v2_url_param';

export interface HeaderProps {
  /** Service name displayed as the flyout title. */
  serviceName: string;
  /** First/last seen timestamps for the service. */
  lastSeen: FirstLastSeenData;
  /** Entity store entity ID. */
  entityId?: string;
  /** Records resolving to `entityId` (aliases); when known, the "Resolved from N" badge counts them. */
  aliasRecords?: readonly EntityStoreRecord[];
  /** Total number of aliases in the store, so the badge is right when `aliasRecords` is capped. */
  aliasCount?: number;
  /** Whether the service exists in the entity store. */
  isEntityInStore?: boolean;
  /** Risk severity level for the service. */
  riskLevel?: RiskSeverity;
  /** Scope id included in the copied Entity Analytics flyout link. */
  scopeId?: string;
  /** Entity-store lookup mode included in the copied Entity Analytics flyout link. */
  mode?: EntityViewMode;
  /** Shows the copy-link button. Set only by the new flyout; the button still hides when the feature flag is off. */
  showEntityAnalyticsCopyLink?: boolean;
}

/**
 * Header component for the service details flyout.
 */
export const Header = ({
  serviceName,
  lastSeen,
  entityId,
  aliasRecords,
  aliasCount,
  isEntityInStore,
  riskLevel,
  scopeId,
  mode,
  showEntityAnalyticsCopyLink,
}: HeaderProps) => {
  const lastSeenDate = lastSeen?.date;
  const isLoading = lastSeen?.isLoading ?? false;
  const lastSeenDateFormatted = useMemo(
    () => lastSeenDate && new Date(lastSeenDate),
    [lastSeenDate]
  );
  const resolvedFromCount = getResolvedFromRecordCount(aliasRecords, aliasCount);
  return (
    <>
      <FlyoutHeaderActions>
        {showEntityAnalyticsCopyLink && (
          <EntityAnalyticsFlyoutCopyLink
            target={{
              kind: 'service',
              serviceName,
              entityId,
              scopeId,
              mode: toEntityDescriptorMode(mode),
            }}
          />
        )}
      </FlyoutHeaderActions>
      <div data-test-subj="service-panel-header">
        <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
          {!isEntityInStore && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" data-test-subj="service-panel-header-lastSeen">
                {isLoading ? (
                  <EuiSkeletonText
                    lines={1}
                    size="xs"
                    data-test-subj="service-panel-header-lastSeen-loading"
                  />
                ) : (
                  lastSeenDateFormatted && <PreferenceFormattedDate value={lastSeenDateFormatted} />
                )}
                <EuiSpacer size="xs" />
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <FlyoutTitle title={serviceName} iconType={EntityIconByType[EntityType.service]} />
          </EuiFlexItem>
          {isLoading ? (
            <EuiFlexItem grow={true}>
              <EuiSkeletonText
                lines={1}
                size="xs"
                data-test-subj="service-panel-header-observed-badge-loading"
              />
            </EuiFlexItem>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge data-test-subj="service-panel-header-entity-type-badge" color="hollow">
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entityDetails.service.entityTypeBadge"
                      defaultMessage="Service"
                    />
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EntitySourceBadge
                    isEntityInStore={!!isEntityInStore}
                    hasLastSeenDate={!!lastSeenDateFormatted}
                    resolvedFromCount={resolvedFromCount}
                    data-test-subj="service-panel-header-observed-badge"
                  />
                </EuiFlexItem>
                {isEntityInStore && riskLevel && (
                  <EuiFlexItem grow={false}>
                    <RiskLevelBadge riskLevel={riskLevel} />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </div>
    </>
  );
};
