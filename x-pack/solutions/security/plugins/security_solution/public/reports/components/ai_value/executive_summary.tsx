/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n as i18nLib } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { CostSavings } from './cost_savings';
import { getTimeRangeAsDays, formatDollars, formatThousands } from './metrics';
import * as i18n from './translations';
import type { ValueMetrics } from './metrics';
import logo from './logo.svg';
import logoDark from './logo-dark.svg';
import { useGetCurrentUserProfile } from '../../../common/components/user_profiles/use_get_current_user_profile';
import { TimeSaved } from './time_saved';
import { FilteringRate } from './filtering_rate';
import { ThreatsDetected } from './threats_detected';

interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
  hasAttackDiscoveries: boolean;
  valueMetrics: ValueMetrics;
  valueMetricsCompare: ValueMetrics;
  minutesPerAlert: number;
  analystHourlyRate: number;
}

export const ExecutiveSummary: React.FC<Props> = ({
  attackAlertIds,
  minutesPerAlert,
  analystHourlyRate,
  hasAttackDiscoveries,
  from,
  to,
  valueMetrics,
  valueMetricsCompare,
}) => {
  const { data: currentUserProfile } = useGetCurrentUserProfile();
  const subtitle = useMemo(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const currentLocale = i18nLib.getLocale();

    return `${fromDate.toLocaleDateString(currentLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} - ${toDate.toLocaleDateString(currentLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }, [from, to]);
  const isDarkMode = useKibanaIsDarkMode();
  const isSmall = useIsWithinMaxBreakpoint('m');
  const costSavings = useMemo(
    () => formatDollars(valueMetrics.costSavings),
    [valueMetrics.costSavings]
  );

  const timerangeAsDays = useMemo(() => getTimeRangeAsDays({ from, to }), [from, to]);

  const logoSvg = useMemo(() => (isDarkMode ? logoDark : logo), [isDarkMode]);
  const {
    euiTheme: { size },
  } = useEuiTheme();
  return (
    <div
      data-test-subj="executiveSummaryContainer"
      css={css`
        // background: linear-gradient(
        //     112deg,
        //     rgba(89, 159, 254, 0.08) 3.58%,
        //     rgba(240, 78, 152, 0.08) 98.48%
        //   ),
        //   url(${logoSvg}) no-repeat bottom right;
        border-radius: ${size.s};
        padding: ${size.base};
        min-height: 200px;
      `}
    >
      <EuiTitle size="l" data-test-subj="executiveSummaryTitle">
        <h1>{i18n.EXECUTIVE_SUMMARY_TITLE}</h1>
      </EuiTitle>

      <EuiText size="s" color="subdued" data-test-subj="executiveSummaryDateRange">
        <p>{subtitle}</p>
      </EuiText>

      <EuiSpacer size="l" />

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
                  {i18n.EXECUTIVE_SUMMARY_SUBTITLE}
                  <strong>
                    {i18n.EXECUTIVE_SAVINGS_SUMMARY({
                      costSavings,
                      hoursSaved: formatThousands(valueMetrics.hoursSaved),
                    })}
                  </strong>
                  {i18n.EXECUTIVE_SUMMARY_MAIN_TEXT({
                    timeRange: timerangeAsDays,
                    minutesPerAlert,
                    analystRate: analystHourlyRate,
                  })}
                  <br />
                  <br />
                  {i18n.EXECUTIVE_SUMMARY_SECONDARY_TEXT}
                </p>
              )}
              {!hasAttackDiscoveries && (
                <p data-test-subj="executiveSummaryNoAttacks">
                  {i18n.EXECUTIVE_MESSAGE_NO_ATTACKS}
                </p>
              )}
            </EuiText>
          </span>
        </EuiFlexItem>

        {/* Right side - Only Cost Savings card */}
        {hasAttackDiscoveries && (
          <EuiFlexItem
            css={css`
              min-width: 300px;
              display: grid;
            `}
            grow={isSmall}
            data-test-subj="executiveSummarySideStats"
          >
            <CostSavings
              analystHourlyRate={analystHourlyRate}
              costSavings={valueMetrics.costSavings}
              costSavingsCompare={valueMetricsCompare.costSavings}
              minutesPerAlert={minutesPerAlert}
              from={from}
              to={to}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {/* Bottom row - Three KPI cards */}
      {hasAttackDiscoveries && (
        <>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction={isSmall ? 'column' : 'row'} gutterSize="m">
            <EuiFlexItem
              css={css`
                display: grid;
              `}
            >
              <TimeSaved
                minutesPerAlert={minutesPerAlert}
                hoursSaved={valueMetrics.hoursSaved}
                hoursSavedCompare={valueMetricsCompare.hoursSaved}
                from={from}
                to={to}
              />
            </EuiFlexItem>
            {/* Alert filtering rate card */}
            <EuiFlexItem
              css={css`
                display: grid;
              `}
            >
              <FilteringRate
                attackAlertIds={attackAlertIds}
                totalAlerts={valueMetrics.totalAlerts}
                filteredAlertsPerc={valueMetrics.filteredAlertsPerc}
                filteredAlertsPercCompare={valueMetricsCompare.filteredAlertsPerc}
                from={from}
                to={to}
              />
            </EuiFlexItem>

            {/* Real threats detected card */}
            <EuiFlexItem
              css={css`
                display: grid;
              `}
            >
              <ThreatsDetected
                attackDiscoveryCount={valueMetrics.attackDiscoveryCount}
                attackDiscoveryCountCompare={valueMetricsCompare.attackDiscoveryCount}
                from={from}
                to={to}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </div>
  );
};
