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
import { SectionPanel } from './section_panel';
import { INSIGHTS_CORRELATIONS_TEST_ID } from '../constants/test_ids';

export interface CorrelationsOverviewProps {
  /** Alert IDs belonging to the attack; the count is displayed as related alerts. */
  alertIds: string[];
  /** Callback to open the Correlations tool flyout. */
  onShowCorrelations: () => void;
}

/**
 * Correlation section for the attack flyout. Renders the related alerts count.
 */
export const CorrelationsOverview: React.FC<CorrelationsOverviewProps> = memo(
  ({ alertIds, onShowCorrelations }) => {
    const { euiTheme } = useEuiTheme();
    const relatedAlertsCount = alertIds.length;

    const link = useMemo(
      () => ({
        callback: onShowCorrelations,
        tooltip: (
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.attack.overview.insights.correlationsLinkTooltip"
            defaultMessage="Show related alerts"
          />
        ),
      }),
      [onShowCorrelations]
    );

    return (
      <SectionPanel
        data-test-subj={INSIGHTS_CORRELATIONS_TEST_ID}
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyoutV2.attack.overview.insights.correlationTitle"
            defaultMessage="Correlation"
          />
        }
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
                    id="xpack.securitySolution.flyoutV2.attack.overview.insights.relatedAlerts"
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
