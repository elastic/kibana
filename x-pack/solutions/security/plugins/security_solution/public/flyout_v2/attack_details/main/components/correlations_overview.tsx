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
import type { DataTableRecord } from '@kbn/discover-utils';
import { SectionPanel } from './section_panel';
import { useOriginalAlertIds } from '../hooks/use_original_alert_ids';
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
   * The attack-discovery document hit. Forwarded to `useOriginalAlertIds`
   * for the related-alerts count.
   */
  hit: DataTableRecord;
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
  ({ hit, onShowAttackCorrelations }) => {
    const { euiTheme } = useEuiTheme();
    const originalAlertIds = useOriginalAlertIds(hit);
    const relatedAlertsCount = originalAlertIds.length;

    const link = useMemo(
      () => ({ callback: onShowAttackCorrelations, tooltip: TOOLTIP }),
      [onShowAttackCorrelations]
    );

    return (
      <SectionPanel
        data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID}
        title={TITLE}
        highlightTitle
        link={link}
        linkIconType="arrowStart"
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
      </SectionPanel>
    );
  }
);

CorrelationsOverview.displayName = 'CorrelationsOverview';
