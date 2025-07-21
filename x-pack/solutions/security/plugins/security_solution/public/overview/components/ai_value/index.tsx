/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { CostSavingsTrend } from './cost_savings_trend';
import { useStyles } from './beacon.styles';
import {
  getTimeSavedHours,
  getCostSavings,
  getAlertStats,
  getAttackDetectionComparison,
  getResponseTimeTrend,
  formatDollars,
} from './metrics';
import bg from './bg.svg';
import { UsdIcon } from './usd_icon';

interface Props {
  alertsInAttacks: number;
  attackDiscoveryCount: number;
  totalAlerts: number;
  from: string;
  to: string;
}

export const AIValueMetrics: React.FC<Props> = ({
  alertsInAttacks,
  attackDiscoveryCount,
  totalAlerts,
  from,
  to,
}) => {
  const data = {
    totalAlerts,
    filteredAlerts: totalAlerts - alertsInAttacks,
    aiDetected: attackDiscoveryCount,
    traditionalDetected: 80,
  };

  const hoursSaved = getTimeSavedHours(data.filteredAlerts);
  const costSavings = getCostSavings(data.filteredAlerts);
  const alertStats = getAlertStats({
    totalAlerts: data.totalAlerts,
    filteredAlerts: data.filteredAlerts,
  });
  const detectionComparison = getAttackDetectionComparison(
    data.aiDetected,
    data.traditionalDetected
  );
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const isMedium = useIsWithinBreakpoints(['m', 'l']);

  const responsiveSizes = useMemo(() => {
    if (isMobile) {
      return {
        headerSize: '20px',
        ringSize: '80px',
      };
    }
    if (isMedium) {
      return {
        headerSize: '26px',
        ringSize: '100px',
      };
    }
    // large sizes
    return {
      headerSize: '32px',
      ringSize: '130px',
    };
  }, [isMedium, isMobile]);

  const { root, rings } = useStyles({
    ringsColor: colors.accentSecondary,
    size: responsiveSizes.ringSize,
  });
  console.log('root/rings', { root, rings });
  console.log('alertStats', alertStats);
  console.log('detectionComparison', detectionComparison);
  const responseTimeTrend = getResponseTimeTrend([30, 28, 32], [20, 18, 22]); // beforeAI and afterAI arrays
  return (
    <>
      <EuiFlexGroup gutterSize="xl" responsive={false}>
        <div
          style={{
            backgroundImage: `url(${bg})`,
            backgroundPosition: 'center',
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            borderRadius: 16,
            width: '100%',
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            display: 'flex',
            flex: 1,
          }}
        >
          {/* Left: Cost savings circle metric */}
          <EuiFlexItem grow={false}>
            <div css={root}>
              <EuiFlexGroup
                direction="column"
                alignItems="center"
                justifyContent="center"
                gutterSize="s"
                className="eui-textCenter"
              >
                <EuiText size="xs" color="subdued">
                  <p>
                    <EuiIcon type={UsdIcon as unknown as ComponentType} size="l" color="accent" />
                    <EuiSpacer size="xs" /> {'Cost savings '}
                    <EuiIconTip
                      type="info"
                      content="Estimated cost reduction based on analyst time saved"
                    />
                  </p>
                </EuiText>

                <EuiTitle size="l">
                  <h2 style={{ fontSize: responsiveSizes.headerSize, color: colors.success }}>
                    {formatDollars(costSavings)}
                  </h2>
                </EuiTitle>

                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <EuiBadge color="success" iconType="sortUp">
                    {'+23%'}
                  </EuiBadge>
                  <EuiText size="xs" color="subdued">
                    <p>{'over the last 30 days'}</p>
                  </EuiText>
                </span>

                <EuiText size="xs" color="subdued">
                  <p>{'Based on analyst time saved'}</p>
                </EuiText>
              </EuiFlexGroup>
              <span css={rings} />
            </div>
          </EuiFlexItem>

          {/* Right: Cost savings trend chart */}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" justifyContent="spaceAround" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText>
                  <h4>{'Cost savings trend'}</h4>
                </EuiText>
                <EuiText size="s" color="subdued">
                  <p>{'Cumulative savings from AI-driven SOC operations'}</p>
                </EuiText>
                <CostSavingsTrend from={from} to={to} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </div>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={3} gutterSize="l" responsive={false}>
        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Real threats detected'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiStat title="14" description="AI-identified genuine threats" titleColor="accent" />
          <EuiText size="s">{'+45 % over the last 30 days'}</EuiText>
        </EuiPanel>

        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Alert filtering rate'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiStat title="89.7%" description="AI-filtered false positives" />
          <EuiText size="s">{'+28 % over the last 30 days'}</EuiText>
        </EuiPanel>

        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Analyst time saved'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiStat title="3,211h" description="Time saved" />
          <EuiText size="s">{'+31 % over the last 30 days'}</EuiText>
          <EuiText size="s">{'You didn’t need to hire ~2 extra analysts'}</EuiText>
        </EuiPanel>
      </EuiFlexGrid>

      <EuiSpacer size="l" />

      <EuiFlexGrid columns={2} gutterSize="l" responsive={false}>
        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Response time analysis'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {/* Replace with your EuiChart component */}
          {/* <ResponseTimeChart />*/}
          <EuiText size="s">{'3.7m Avg AI response, 25.7m Avg traditional'}</EuiText>
        </EuiPanel>

        <EuiPanel paddingSize="l">
          <EuiTitle size="s">
            <h3>{'Alert processing analytics'}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {/* Replace with EuiChart or pie chart */}
          {/* <AlertProcessingPie />*/}
          <EuiText size="s">{'Total alerts processed: 13,890'}</EuiText>
        </EuiPanel>
      </EuiFlexGrid>

      <EuiSpacer size="l" />

      <EuiPanel paddingSize="l">
        <EuiTitle size="s">
          <h3>{'Threat detection comparison'}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {/* Replace with bar chart */}
        {/* <ThreatDetectionComparisonChart />*/}
      </EuiPanel>

      <EuiSpacer size="l" />

      <EuiText size="xs">
        {'Cost calculations: Time saved × average analyst hourly rate: $75/h.'}{' '}
        <EuiLink href="#">{'Change rate in settings'}</EuiLink>
      </EuiText>
    </>
    // <EuiPanel hasBorder paddingSize="xl">
    //   <EuiText>
    //     <h3>{'Static data'}</h3>
    //     <ul>
    //       <li>{`Minutes saved per alert: ${MINUTES_SAVED_PER_ALERT}`}</li>
    //       <li>{`Hourly analyst rate: ${formatDollars(HOURLY_ANALYST_RATE)}`}</li>
    //       <li>{`Total alerts: ${formatThousands(data.totalAlerts)}`}</li>
    //       <li>{`Filtered alerts: ${formatThousands(data.filteredAlerts)}`}</li>
    //       <li>{`AI Detected threats: ${formatThousands(data.aiDetected)}`}</li>
    //       <li>{`Human detected threats: ${formatThousands(data.traditionalDetected)}`}</li>
    //     </ul>
    //     <h3>{'Calculated data'}</h3>
    //     <ul>
    //       <li>{`Hours saved: ${formatThousandsDecimal(hoursSaved)}`}</li>
    //       <li>{`Cost savings: ${formatDollars(costSavings)}`}</li>
    //       <li>{`Alerts escalated: ${formatThousands(alertStats.escalated)}`}</li>
    //       <li>{`Alerts filteredPercentage: ${formatPercent(alertStats.filteredPercentage)}`}</li>
    //       <li>{`Alerts escalatedPercentage: ${formatPercent(alertStats.escalatedPercentage)}`}</li>
    //       <li>{`aiPercentage: ${formatPercent(detectionComparison.aiPercentage)}`}</li>
    //       <li>{`traditionalPercentage: ${formatPercent(
    //         detectionComparison.traditionalPercentage
    //       )}`}</li>
    //       <li>{`Response time averageBeforeAI: ${formatThousands(
    //         responseTimeTrend.averageBeforeAI
    //       )}`}</li>
    //       <li>{`Response time averageAfterAI: ${formatThousands(
    //         responseTimeTrend.averageAfterAI
    //       )}`}</li>
    //       <li>{`Response time improvement: ${formatThousands(responseTimeTrend.improvement)}`}</li>
    //       <li>{`Response time improvementPercent: ${formatPercent(
    //         responseTimeTrend.improvementPercent
    //       )}`}</li>
    //     </ul>
    //   </EuiText>
    // </EuiPanel>
  );
};
