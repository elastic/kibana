/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getPercChange } from '../detection_response/soc_trends/helpers';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays } from './utils';
import {
  formatDollars,
  formatPercent,
  formatThousands,
  getCostSavings,
  getFormattedPercChange,
} from './metrics';
import * as i18n from './translations';
import type { ValueMetrics } from './metrics';
import logo from './logo.svg';
import { useGetCurrentUserProfile } from '../../../common/components/user_profiles/use_get_current_user_profile';
interface Props {
  attackAlertIds: string[];
  minutesPerAlert: number;
  analystHourlyRate: number;
  filteredAlerts: number;
  filteredAlertsCompare: number;
  from: string;
  to: string;
  valueMetrics: ValueMetrics;
  valueMetricsCompare: ValueMetrics;
}

export const ExecutiveSummary: React.FC<Props> = ({
  attackAlertIds,
  filteredAlerts,
  filteredAlertsCompare,
  from,
  to,
  minutesPerAlert,
  analystHourlyRate,
  valueMetrics,
  valueMetricsCompare,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const costSavings = useMemo(
    () =>
      formatDollars(getCostSavings({ alerts: filteredAlerts, analystHourlyRate, minutesPerAlert })),
    [filteredAlerts, minutesPerAlert, analystHourlyRate]
  );
  const costSavingsCompare = useMemo(
    () =>
      formatDollars(
        getCostSavings({ alerts: filteredAlertsCompare, analystHourlyRate, minutesPerAlert })
      ),
    [filteredAlertsCompare, minutesPerAlert, analystHourlyRate]
  );
  const { data: currentUserProfile } = useGetCurrentUserProfile();

  return (
    <div
      css={css`
        background: linear-gradient(
            112deg,
            rgba(89, 159, 254, 0.08) 3.58%,
            rgba(240, 78, 152, 0.08) 98.48%
          ),
          url(${logo}) no-repeat bottom right;
        border-radius: 8px;
        padding: 24px;
      `}
    >
      <span>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElastic" size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <p>
                {i18n.EXECUTIVE_GREETING(
                  currentUserProfile?.user?.full_name ?? currentUserProfile?.user?.username ?? ''
                )}
              </p>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiText size="s">
          <p>
            {i18n.EXECUTIVE_MESSAGE_START} <strong>{costSavings}</strong>{' '}
            {i18n.EXECUTIVE_COST_SAVINGS_LABEL} {i18n.EXECUTIVE_AND}{' '}
            <strong>{formatThousands(valueMetrics.hoursSaved)}</strong>{' '}
            {i18n.EXECUTIVE_HOURS_SAVED_LABEL}{' '}
            {i18n.EXECUTIVE_MESSAGE_END(i18n.TIME_RANGE(getTimeRangeAsDays({ from, to })))}{' '}
            {i18n.EXECUTIVE_CALC} <strong>{i18n.MINUTES_PER_ALERT('8')}</strong>{' '}
            {i18n.EXECUTIVE_AND_A} <strong>{i18n.ANALYST_RATE('$75')}</strong>
            {'.'}
            <br />
            <br />
            {i18n.EXECUTIVE_MESSAGE_SECOND}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiText size="s">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ padding: '5px 0' }}>
              <EuiIcon type="checkInCircleFilled" color="success" /> <strong>{costSavings}</strong>{' '}
              {i18n.EXECUTIVE_COST_SAVINGS_DESC}
              {'. '}
              <ComparePercentage
                currentCount={valueMetrics.filteredAlerts}
                previousCount={valueMetricsCompare.filteredAlerts}
                stat={costSavingsCompare}
                statType={i18n.COST_SAVINGS_TITLE.toLowerCase()}
                timeRange={getTimeRangeAsDays({ from, to })}
              />
            </li>
            <li style={{ padding: '5px 0' }}>
              <EuiIcon type="checkInCircleFilled" color="success" />{' '}
              <strong>{formatPercent(valueMetrics.filteredAlertsPerc)}</strong>{' '}
              {i18n.EXECUTIVE_ALERT_FILTERING_DESC}
              {'. '}
              <ComparePercentage
                currentCount={valueMetrics.filteredAlertsPerc}
                previousCount={valueMetricsCompare.filteredAlertsPerc}
                stat={formatPercent(valueMetricsCompare.filteredAlertsPerc)}
                statType={i18n.FILTERING_RATE.toLowerCase()}
                timeRange={getTimeRangeAsDays({ from, to })}
              />
            </li>
            <li style={{ padding: '5px 0' }}>
              <EuiIcon type="checkInCircleFilled" color="success" />{' '}
              <strong>{formatThousands(valueMetrics.hoursSaved)}</strong>{' '}
              {i18n.EXECUTIVE_HOURS_SAVED_DESC}
              {'. '}
              <ComparePercentage
                currentCount={valueMetrics.hoursSaved}
                previousCount={valueMetricsCompare.hoursSaved}
                stat={formatThousands(valueMetricsCompare.hoursSaved)}
                statType={i18n.TIME_SAVED_DESC.toLowerCase()}
                timeRange={getTimeRangeAsDays({ from, to })}
              />
            </li>
            <li style={{ padding: '5px 0' }}>
              <EuiIcon type="checkInCircleFilled" color="success" />{' '}
              <strong>
                {getFormattedPercChange(
                  valueMetrics.attackDiscoveryCount,
                  valueMetricsCompare.attackDiscoveryCount
                )}
              </strong>{' '}
              {i18n.EXECUTIVE_THREATS_DETECTED_DESC(
                (
                  getPercChange(
                    valueMetrics.attackDiscoveryCount,
                    valueMetricsCompare.attackDiscoveryCount
                  ) ?? '0.0%'
                ).charAt(0) !== '-'
              )}
              {'. '}
              <ComparePercentage
                currentCount={valueMetrics.attackDiscoveryCount}
                previousCount={valueMetricsCompare.attackDiscoveryCount}
                stat={`${valueMetricsCompare.attackDiscoveryCount}`}
                statType={i18n.ATTACK_DISCOVERY_COUNT.toLowerCase()}
                timeRange={getTimeRangeAsDays({ from, to })}
              />
            </li>
          </ul>
        </EuiText>
      </span>
    </div>
  );
};
