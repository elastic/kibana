/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { DEFAULT_NUMBER_FORMAT } from '../../../../../common/constants';
import { useUiSetting$ } from '../../../../common/lib/kibana';
import type { TimelineKpiStrategyResponse } from '../../../../../common/search_strategy';
import { getEmptyValue } from '../../../../common/components/empty_value';
import * as i18n from './translations';

export const StatsContainer = memo(({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      css={css`
        font-size: ${euiTheme.font.scale.xs};
        font-weight: ${euiTheme.font.weight.semiBold};
        padding-right: ${euiTheme.size.base};

        .smallDot {
          width: 3px !important;
          display: inline-block;
        }

        .euiBadge__text {
          text-align: center;
          width: 100%;
        }
      `}
    >
      {children}
    </span>
  );
});
StatsContainer.displayName = 'StatsContainer';

export const TimelineKPIs = React.memo(({ kpis }: { kpis: TimelineKpiStrategyResponse | null }) => {
  const kpiFormat = '0,0.[000]a';
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const formattedKpis = useMemo(() => {
    return {
      process: kpis === null ? getEmptyValue() : numeral(kpis.processCount).format(kpiFormat),
      user: kpis === null ? getEmptyValue() : numeral(kpis.userCount).format(kpiFormat),
      host: kpis === null ? getEmptyValue() : numeral(kpis.hostCount).format(kpiFormat),
      sourceIp: kpis === null ? getEmptyValue() : numeral(kpis.sourceIpCount).format(kpiFormat),
      destinationIp:
        kpis === null ? getEmptyValue() : numeral(kpis.destinationIpCount).format(kpiFormat),
    };
  }, [kpis]);

  const formattedKpiToolTips = useMemo(() => {
    return {
      process: numeral(kpis?.processCount).format(defaultNumberFormat),
      user: numeral(kpis?.userCount).format(defaultNumberFormat),
      host: numeral(kpis?.hostCount).format(defaultNumberFormat),
      sourceIp: numeral(kpis?.sourceIpCount).format(defaultNumberFormat),
      destinationIp: numeral(kpis?.destinationIpCount).format(defaultNumberFormat),
    };
  }, [kpis, defaultNumberFormat]);

  return (
    <EuiFlexGroup wrap data-test-subj="siem-timeline-kpis">
      <EuiFlexItem grow={false}>
        <StatsContainer>
          {`${i18n.PROCESS_KPI_TITLE} : `}
          <EuiToolTip position="left" content={formattedKpiToolTips.process}>
            <EuiBadge color="hollow" data-test-subj={'siem-timeline-process-kpi'}>
              {formattedKpis.process}
            </EuiBadge>
          </EuiToolTip>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          {`${i18n.USER_KPI_TITLE} : `}
          <EuiToolTip position="left" content={formattedKpiToolTips.user}>
            <EuiBadge color="hollow" data-test-subj={'siem-timeline-user-kpi'}>
              {formattedKpis.user}
            </EuiBadge>
          </EuiToolTip>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          {`${i18n.HOST_KPI_TITLE} : `}
          <EuiToolTip position="left" content={formattedKpiToolTips.host}>
            <EuiBadge color="hollow" data-test-subj={'siem-timeline-host-kpi'}>
              {formattedKpis.host}
            </EuiBadge>
          </EuiToolTip>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <StatsContainer>
          {`${i18n.SOURCE_IP_KPI_TITLE} : `}
          <EuiToolTip position="left" content={formattedKpiToolTips.sourceIp}>
            <EuiBadge color="hollow" data-test-subj={'siem-timeline-source-ip-kpi'}>
              {formattedKpis.sourceIp}
            </EuiBadge>
          </EuiToolTip>
        </StatsContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ minWidth: 100 }}>
        <StatsContainer>
          {`${i18n.DESTINATION_IP_KPI_TITLE} : `}
          <EuiToolTip position="left" content={formattedKpiToolTips.destinationIp}>
            <EuiBadge color="hollow" data-test-subj={'siem-timeline-destination-ip-kpi'}>
              {formattedKpis.destinationIp}
            </EuiBadge>
          </EuiToolTip>
        </StatsContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

TimelineKPIs.displayName = 'TimelineKPIs';
