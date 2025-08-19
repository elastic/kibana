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
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { ExecutiveSummaryListItem } from './executive_summary_list_item';
import { CostSavings } from './cost_savings';
import { getPercChange } from '../../../overview/components/detection_response/soc_trends/helpers';
import { ComparePercentage } from './compare_percentage';
import {
  getTimeRangeAsDays,
  formatDollars,
  formatPercent,
  formatThousands,
  getFormattedPercChange,
} from './metrics';
import * as i18n from './translations';
import type { ValueMetrics } from './metrics';
import logo from './logo.svg';
import logoDark from './logo-dark.svg';
import { useGetCurrentUserProfile } from '../../../common/components/user_profiles/use_get_current_user_profile';
import { TimeSaved } from './time_saved';
interface Props {
  from: string;
  to: string;
  hasAttackDiscoveries: boolean;
  valueMetrics: ValueMetrics;
  valueMetricsCompare: ValueMetrics;
  minutesPerAlert: number;
  analystHourlyRate: number;
}

const LI_PADDING = css`
  padding: 5px 0;
`;

export const ExecutiveSummary: React.FC<Props> = ({
  minutesPerAlert,
  analystHourlyRate,
  hasAttackDiscoveries,
  from,
  to,
  valueMetrics,
  valueMetricsCompare,
}) => {
  const { data: currentUserProfile } = useGetCurrentUserProfile();

  const isDarkMode = useKibanaIsDarkMode();
  const isSmall = useIsWithinMaxBreakpoint('l');
  const costSavings = useMemo(
    () => formatDollars(valueMetrics.costSavings),
    [valueMetrics.costSavings]
  );
  const costSavingsCompare = useMemo(
    () => formatDollars(valueMetricsCompare.costSavings),
    [valueMetricsCompare.costSavings]
  );

  const hasAttackDiscoveryComparison = useMemo(
    () => valueMetrics.attackDiscoveryCount > 0 && valueMetricsCompare.attackDiscoveryCount > 0,
    [valueMetrics.attackDiscoveryCount, valueMetricsCompare.attackDiscoveryCount]
  );

  const attackDiscoveryStat = useMemo(() => {
    return hasAttackDiscoveryComparison
      ? getFormattedPercChange(
          valueMetrics.attackDiscoveryCount,
          valueMetricsCompare.attackDiscoveryCount
        )
      : valueMetrics.attackDiscoveryCount;
  }, [
    hasAttackDiscoveryComparison,
    valueMetrics.attackDiscoveryCount,
    valueMetricsCompare.attackDiscoveryCount,
  ]);
  const timerangeAsDays = useMemo(() => getTimeRangeAsDays({ from, to }), [from, to]);

  const logoSvg = useMemo(() => (isDarkMode ? logoDark : logo), [isDarkMode]);

  return (
    <div
      data-test-subj="executiveSummaryContainer"
      css={css`
        background: linear-gradient(
            112deg,
            rgba(89, 159, 254, 0.08) 3.58%,
            rgba(240, 78, 152, 0.08) 98.48%
          ),
          url(${logoSvg}) no-repeat bottom right;
        border-radius: 8px;
        padding: 24px;
        min-height: 200px;
      `}
    >
      <EuiFlexGroup
        direction={isSmall ? 'column' : 'row'}
        data-test-subj="executiveSummaryFlexGroup"
      >
        <EuiFlexItem
          css={css`
            min-width: 350px;
          `}
          data-test-subj="executiveSummaryMainInfo"
        >
          <span>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              data-test-subj="executiveSummaryGreetingGroup"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="logoElastic" size="m" data-test-subj="executiveSummaryLogo" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <p data-test-subj="executiveSummaryGreeting">
                    {i18n.EXECUTIVE_GREETING(
                      currentUserProfile?.user?.full_name ??
                        currentUserProfile?.user?.username ??
                        ''
                    )}
                  </p>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiText size="s">
              {hasAttackDiscoveries && (
                <p data-test-subj="executiveSummaryMessage">
                  {i18n.EXECUTIVE_MESSAGE_START} <strong>{costSavings}</strong>{' '}
                  {i18n.EXECUTIVE_COST_SAVINGS_LABEL} {i18n.EXECUTIVE_AND}{' '}
                  <strong>
                    {formatThousands(valueMetrics.hoursSaved)} {i18n.EXECUTIVE_HOURS_SAVED_LABEL}
                  </strong>{' '}
                  {i18n.EXECUTIVE_MESSAGE_END(i18n.TIME_RANGE(timerangeAsDays))}{' '}
                  {i18n.EXECUTIVE_FILTERING}
                  <br />
                  <br />
                  {i18n.EXECUTIVE_CALC} <strong>{i18n.ESCALATED.toLowerCase()}</strong>{' '}
                  {i18n.EXECUTIVE_SUSPICIOUS} <strong>{i18n.NON_SUSPICIOUS}</strong>
                  {'. '}
                  {i18n.EXECUTIVE_CALC2}{' '}
                  <strong>{i18n.MINUTES_PER_ALERT(`${minutesPerAlert}`)}</strong>
                  {', '}
                  {i18n.EXECUTIVE_CONVERT}{' '}
                  <strong>{i18n.ANALYST_RATE(`$${analystHourlyRate}`)}</strong>
                  {'.'}
                  <br />
                  <br />
                  {i18n.EXECUTIVE_MESSAGE_SECOND}
                </p>
              )}
              {!hasAttackDiscoveries && (
                <p data-test-subj="executiveSummaryNoAttacks">
                  {i18n.EXECUTIVE_MESSAGE_NO_ATTACKS}
                </p>
              )}
            </EuiText>

            <EuiSpacer size="m" />

            {hasAttackDiscoveries && (
              <EuiText size="s">
                <ul
                  css={css`
                    list-style: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  `}
                  data-test-subj="executiveSummaryStatsList"
                >
                  <li css={LI_PADDING} data-test-subj="executiveSummaryCostSavingsStat">
                    <ExecutiveSummaryListItem>
                      <strong>{costSavings}</strong> {i18n.EXECUTIVE_COST_SAVINGS_DESC}
                      {'. '}
                      <ComparePercentage
                        currentCount={valueMetrics.filteredAlerts}
                        previousCount={valueMetricsCompare.filteredAlerts}
                        stat={costSavingsCompare}
                        statType={i18n.COST_SAVINGS_TITLE.toLowerCase()}
                        timeRange={timerangeAsDays}
                      />
                    </ExecutiveSummaryListItem>
                  </li>
                  <li css={LI_PADDING} data-test-subj="executiveSummaryAlertFilteringStat">
                    <ExecutiveSummaryListItem>
                      <strong>{formatPercent(valueMetrics.filteredAlertsPerc)}</strong>{' '}
                      {i18n.EXECUTIVE_ALERT_FILTERING_DESC}
                      {'. '}
                      <ComparePercentage
                        currentCount={valueMetrics.filteredAlertsPerc}
                        previousCount={valueMetricsCompare.filteredAlertsPerc}
                        stat={formatPercent(valueMetricsCompare.filteredAlertsPerc)}
                        statType={i18n.FILTERING_RATE.toLowerCase()}
                        timeRange={timerangeAsDays}
                      />
                    </ExecutiveSummaryListItem>
                  </li>
                  <li css={LI_PADDING} data-test-subj="executiveSummaryHoursSavedStat">
                    <ExecutiveSummaryListItem>
                      <strong>{formatThousands(valueMetrics.hoursSaved)}</strong>{' '}
                      {i18n.EXECUTIVE_HOURS_SAVED_DESC}
                      {'. '}
                      <ComparePercentage
                        currentCount={valueMetrics.hoursSaved}
                        previousCount={valueMetricsCompare.hoursSaved}
                        stat={formatThousands(valueMetricsCompare.hoursSaved)}
                        statType={i18n.TIME_SAVED_DESC.toLowerCase()}
                        timeRange={timerangeAsDays}
                      />
                    </ExecutiveSummaryListItem>
                  </li>
                  <li css={LI_PADDING} data-test-subj="executiveSummaryThreatsDetectedStat">
                    <ExecutiveSummaryListItem>
                      <strong>{attackDiscoveryStat}</strong>{' '}
                      {hasAttackDiscoveryComparison
                        ? i18n.EXECUTIVE_THREATS_DETECTED_DESC(
                            (
                              getPercChange(
                                valueMetrics.attackDiscoveryCount,
                                valueMetricsCompare.attackDiscoveryCount
                              ) ?? '0.0%'
                            ).charAt(0) !== '-'
                          )
                        : i18n.EXECUTIVE_THREATS_DETECTED_DESC_NO_COMPARE}
                      {'. '}
                      <ComparePercentage
                        currentCount={valueMetrics.attackDiscoveryCount}
                        previousCount={valueMetricsCompare.attackDiscoveryCount}
                        stat={`${valueMetricsCompare.attackDiscoveryCount}`}
                        statType={i18n.ATTACK_DISCOVERY_COUNT.toLowerCase()}
                        timeRange={timerangeAsDays}
                      />
                    </ExecutiveSummaryListItem>
                  </li>
                </ul>
              </EuiText>
            )}
          </span>
        </EuiFlexItem>
        {hasAttackDiscoveries && (
          <EuiFlexItem
            css={css`
              min-width: 300px;
            `}
            grow={isSmall}
            data-test-subj="executiveSummarySideStats"
          >
            <EuiFlexGroup direction={isSmall ? 'row' : 'column'}>
              <EuiFlexItem>
                <CostSavings
                  analystHourlyRate={analystHourlyRate}
                  costSavings={valueMetrics.costSavings}
                  costSavingsCompare={valueMetricsCompare.costSavings}
                  minutesPerAlert={minutesPerAlert}
                  from={from}
                  to={to}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <TimeSaved
                  minutesPerAlert={minutesPerAlert}
                  hoursSaved={valueMetrics.hoursSaved}
                  hoursSavedCompare={valueMetricsCompare.hoursSaved}
                  from={from}
                  to={to}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </div>
  );
};
