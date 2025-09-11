/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';
import type { ValueMetrics } from './metrics';
import { formatThousands, formatPercent } from './metrics';

interface Props {
  isLoading: boolean;
  valueMetrics: ValueMetrics;
}

export const AlertProcessingKeyInsight: React.FC<Props> = ({ isLoading, valueMetrics }) => {
  const {
    euiTheme: { size },
  } = useEuiTheme();
  return (
    <div
      data-test-subj="alertProcessingKeyInsightsContainer"
      css={css`
        background: linear-gradient(
          112deg,
          rgba(89, 159, 254, 0.08) 3.58%,
          rgba(240, 78, 152, 0.08) 98.48%
        );
        border-radius: ${size.s};
        padding: ${size.base};
        min-height: 200px;
      `}
    >
      <span>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          data-test-subj="alertProcessingKeyInsightsGreetingGroup"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElastic" size="m" data-test-subj="alertProcessingKeyInsightsLogo" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <p data-test-subj="alertProcessingKeyInsightsGreeting">{i18n.KEY_INSIGHT}</p>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />
        {isLoading ? (
          <>
            <EuiSkeletonText lines={3} size="s" isLoading={true} />
            <EuiSkeletonText lines={3} size="s" isLoading={true} />
            <EuiHorizontalRule />
            <EuiSkeletonText lines={2} size="s" isLoading={true} />
          </>
        ) : (
          <EuiText
            size="s"
            css={css`
              line-height: 1.6em;
            `}
          >
            <ul>
              <li
                css={css`
                  margin-bottom: 5px;
                `}
              >
                <strong>
                  {i18n.FILTERED_ALERTS_1({
                    percentage: formatPercent(valueMetrics.filteredAlertsPerc),
                    count: formatThousands(valueMetrics.filteredAlerts),
                  })}
                </strong>
                {i18n.FILTERED_ALERTS_2}
              </li>
              <li>
                <strong>
                  {i18n.ESCALATED_ALERTS_1({
                    percentage: formatPercent(valueMetrics.escalatedAlertsPerc),
                    count: formatThousands(valueMetrics.totalAlerts - valueMetrics.filteredAlerts),
                  })}
                </strong>
                {i18n.ESCALATED_ALERTS_2}
              </li>
            </ul>
            <EuiHorizontalRule />
            <p>{i18n.MINIMIZE_ALERT_FATIGUE}</p>
          </EuiText>
        )}
      </span>
    </div>
  );
};
