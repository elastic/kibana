/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { useHeaderData } from '../hooks/use_header_data';
import { INSIGHTS_CORRELATIONS_TEST_ID } from '../constants/test_ids';

const TITLE = (
  <FormattedMessage
    id="xpack.securitySolution.attackDetailsFlyout.overview.insights.correlationTitle"
    defaultMessage="Correlation"
  />
);

const TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.attackDetailsFlyout.overview.insights.correlationTooltip"
    defaultMessage="Show related alerts"
  />
);

export interface CorrelationsOverviewProps {
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails}.
   * Forwarded to `useHeaderData` to derive the original alert IDs for the
   * related-alerts count.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Callback that opens the attack-specific Correlations child flyout when
   * the section title link is clicked. The wiring lives in
   * `flyout_v2/attack_details/main/index.tsx`.
   */
  onShowAttackCorrelations: () => void;
}

/**
 * Correlation section under Insights section in the Attack Details overview tab.
 * Renders related alerts count with a chevron link that opens the
 * attack-specific Correlations child flyout (related-alerts-by-ancestry only).
 */
export const CorrelationsOverview: React.FC<CorrelationsOverviewProps> = memo(
  ({ attack, onShowAttackCorrelations }) => {
    const { euiTheme } = useEuiTheme();
    const { originalAlertIds } = useHeaderData(attack);
    const relatedAlertsCount = originalAlertIds.length;

    const link = useMemo(
      () => ({ callback: onShowAttackCorrelations, tooltip: TOOLTIP }),
      [onShowAttackCorrelations]
    );

    return (
      <ExpandablePanel
        data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID}
        header={{
          title: TITLE,
          link,
          iconType: 'arrowStart',
        }}
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
                    id="xpack.securitySolution.attackDetailsFlyout.overview.insights.relatedAlerts"
                    defaultMessage="Related alerts"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{relatedAlertsCount}</EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ExpandablePanel>
    );
  }
);

CorrelationsOverview.displayName = 'CorrelationsOverview';
