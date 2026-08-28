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
import { useAttackEntitiesCounts } from '../hooks/use_attack_entities_counts';
import { INSIGHTS_ENTITIES_TEST_ID } from '../constants/test_ids';

export interface EntitiesOverviewProps {
  /** Alert IDs belonging to the attack, used to query entity cardinality. */
  alertIds: string[];
  /** Callback to open the Entities tool flyout. */
  onShowEntities: () => void;
}

/**
 * Entities section for the attack flyout. Renders related users and hosts counts.
 */
export const EntitiesOverview: React.FC<EntitiesOverviewProps> = memo(
  ({ alertIds, onShowEntities }) => {
    const { euiTheme } = useEuiTheme();
    const { relatedUsers, relatedHosts, loading } = useAttackEntitiesCounts(alertIds);

    const link = useMemo(
      () => ({
        callback: onShowEntities,
        tooltip: (
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.attack.overview.insights.entitiesLinkTooltip"
            defaultMessage="Show related entities"
          />
        ),
      }),
      [onShowEntities]
    );

    return (
      <SectionPanel
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.attack.overview.insights.entitiesTitle"
            defaultMessage="Entities"
          />
        }
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
                    id="xpack.securitySolution.flyoutV2.attack.overview.insights.relatedUsers"
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
                    id="xpack.securitySolution.flyoutV2.attack.overview.insights.relatedHosts"
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
