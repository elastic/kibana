/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SectionPanel } from './section_panel';
import { useAttackEntitiesCounts } from '../../../../flyout/attack_details/hooks/use_attack_entities_counts';
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
   * Callback that opens the attack-specific Entities child flyout when the
   * section title link is clicked. The wiring lives in
   * `flyout_v2/attack_details/index.tsx`.
   */
  onShowAttackEntities: () => void;
}

/**
 * Entities section under Insights section in the Attack Details overview tab.
 * Renders related users and related hosts counts with a chevron link that
 * opens the attack-specific Entities child flyout.
 */
export const EntitiesOverview: React.FC<EntitiesOverviewProps> = memo(
  ({ onShowAttackEntities }) => {
    const { euiTheme } = useEuiTheme();
    const { relatedUsers, relatedHosts, loading } = useAttackEntitiesCounts();

    const link = useMemo(
      () => ({ callback: onShowAttackEntities, tooltip: TOOLTIP }),
      [onShowAttackEntities]
    );

    return (
      <SectionPanel
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
        title={TITLE}
        highlightTitle
        link={link}
        linkIconType="chevronLimitLeft"
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          responsive={false}
          css={css`
            padding: ${euiTheme.size.m} ${euiTheme.size.base};
          `}
        >
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
      </SectionPanel>
    );
  }
);

EntitiesOverview.displayName = 'EntitiesOverview';
