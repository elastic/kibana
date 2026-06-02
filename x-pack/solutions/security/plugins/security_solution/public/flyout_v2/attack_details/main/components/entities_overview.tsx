/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSkeletonText, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useAttackEntitiesCounts } from '../hooks/use_attack_entities_counts';
import { INSIGHTS_ENTITIES_TEST_ID } from '../constants/test_ids';

const TITLE = (
  <FormattedMessage
    id="xpack.securitySolution.attackDetailsFlyout.overview.insights.entitiesTitle"
    defaultMessage="Entities"
  />
);

const TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.attackDetailsFlyout.overview.insights.entitiesTooltip"
    defaultMessage="Show all entities"
  />
);

export interface EntitiesOverviewProps {
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails}.
   * Forwarded to `useAttackEntitiesCounts` which derives the alert-id list
   * it queries against.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Callback that opens the attack-specific Entities child flyout when the
   * section title link is clicked. The wiring lives in
   * `flyout_v2/attack_details/main/index.tsx`.
   */
  onShowAttackEntities: () => void;
}

/**
 * Entities section under Insights section in the Attack Details overview tab.
 * Renders related users and related hosts counts with a chevron link that
 * opens the attack-specific Entities child flyout.
 */
export const EntitiesOverview: React.FC<EntitiesOverviewProps> = memo(
  ({ attack, onShowAttackEntities }) => {
    const { relatedUsers, relatedHosts, loading } = useAttackEntitiesCounts(attack);

    const link = useMemo(
      () => ({ callback: onShowAttackEntities, tooltip: TOOLTIP }),
      [onShowAttackEntities]
    );

    return (
      <ExpandablePanel
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
        header={{
          title: TITLE,
          link,
          iconType: 'chevronLimitLeft',
        }}
      >
        <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.securitySolution.attackDetailsFlyout.overview.insights.relatedUsers"
                    defaultMessage="Related users"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {loading ? (
                  <EuiSkeletonText lines={1} size="xs" />
                ) : (
                  <EuiBadge color="hollow">{relatedUsers}</EuiBadge>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.securitySolution.attackDetailsFlyout.overview.insights.relatedHosts"
                    defaultMessage="Related hosts"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {loading ? (
                  <EuiSkeletonText lines={1} size="xs" />
                ) : (
                  <EuiBadge color="hollow">{relatedHosts}</EuiBadge>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ExpandablePanel>
    );
  }
);

EntitiesOverview.displayName = 'EntitiesOverview';
