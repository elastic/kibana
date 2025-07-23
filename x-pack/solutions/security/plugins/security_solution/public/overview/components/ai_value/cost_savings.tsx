/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type ComponentType } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { getTimeRangeAsDays } from './utils';
import { CostSavingsTrend } from './cost_savings_trend';
import { useStyles } from './beacon.styles';
import bg from './bg.svg';
import { UsdIcon } from './usd_icon';
import { formatDollars, getCostSavings } from './metrics';
import { ComparePercentage } from './compare_percentage';
import * as i18n from './translations';
interface Props {
  attackAlertIds: string[];
  minutesPerAlert: number;
  analystHourlyRate: number;
  filteredAlerts: number;
  filteredAlertsCompare: number;
  from: string;
  to: string;
}

export const CostSavings: React.FC<Props> = ({
  attackAlertIds,
  filteredAlerts,
  filteredAlertsCompare,
  from,
  to,
  minutesPerAlert,
  analystHourlyRate,
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
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const isMedium = useIsWithinBreakpoints(['m', 'l']);

  const responsiveSizes = useMemo(() => {
    if (isMobile) {
      return {
        headerSize: '20px',
        ringSize: '60px',
      };
    }
    if (isMedium) {
      return {
        headerSize: '26px',
        ringSize: '80px',
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
  return (
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
                <EuiIcon type={UsdIcon as unknown as ComponentType} size="l" color="accent" />
                <EuiSpacer size="xs" /> {i18n.COST_SAVINGS_TITLE}
                <EuiIconTip type="info" content={i18n.COST_SAVINGS_DESC} />
              </EuiText>

              <EuiTitle size="l">
                <h2 style={{ fontSize: responsiveSizes.headerSize, color: colors.success }}>
                  {costSavings}
                </h2>
              </EuiTitle>

              <ComparePercentage
                currentCount={filteredAlerts}
                previousCount={filteredAlertsCompare}
                stat={costSavingsCompare}
                statType={i18n.COST_SAVINGS}
                timeRange={getTimeRangeAsDays({ from, to })}
              />

              <EuiText size="xs" color="subdued">
                <p>{i18n.COST_SAVINGS_BASIS}</p>
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
                <h4>{i18n.COST_SAVINGS_TREND}</h4>
              </EuiText>
              <EuiText size="s" color="subdued">
                <p>{i18n.COST_SAVINGS_SOC}</p>
              </EuiText>
              <CostSavingsTrend from={from} to={to} attackAlertIds={attackAlertIds} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </div>
    </EuiFlexGroup>
  );
};
