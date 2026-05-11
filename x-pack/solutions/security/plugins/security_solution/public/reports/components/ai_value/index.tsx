/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import dateMath from '@kbn/datemath';
import {
  SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES,
  SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE,
} from '@kbn/management-settings-ids';
import {
  EuiFlexGroup,
  EuiImage,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiBadge,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import analyticsSpeedAcceleration from './analytics_speed_acceleration.svg';
import { AIValueReportLayout } from './ai_value_report_layout';
import { useValueReportData } from '../../hooks/use_value_report_data';
import { useKibana } from '../../../common/lib/kibana';
import { useAIValueExportContext } from '../../providers/ai_value/export_provider';
import { PageLoader } from '../../../common/components/page_loader';
import * as i18n from './translations';
import { SampleAttackDiscoveryCta } from './sample_attack_discovery_cta';

interface Props {
  setHasReportData: React.Dispatch<boolean>;
  isSourcererLoading: boolean;
  from: string;
  to: string;
}

export const AIValueReport: React.FC<Props> = (props) => {
  const { setHasReportData, isSourcererLoading } = props;
  const { settings } = useKibana().services;
  const exportContext = useAIValueExportContext();
  const setReportInputForExportContext = exportContext?.setReportInput;

  // When exporting/scheduling, forwardedState can include relative date-math strings
  // (e.g. now-7d, now). Resolve them to a deterministic absolute range for this run.
  const forceNow = useMemo(() => new Date(), []);
  const { from, to } = useMemo(() => {
    if (exportContext?.forwardedState) {
      const { timeRange } = exportContext.forwardedState;
      const fromValue = timeRange.kind === 'absolute' ? timeRange.from : timeRange.fromStr;
      const toValue = timeRange.kind === 'absolute' ? timeRange.to : timeRange.toStr;
      return {
        from: dateMath.parse(fromValue, { forceNow })?.toISOString() ?? fromValue,
        to: dateMath.parse(toValue, { forceNow, roundUp: true })?.toISOString() ?? toValue,
      };
    }
    return {
      from: props.from,
      to: props.to,
    };
  }, [props.from, props.to, exportContext?.forwardedState, forceNow]);

  const { analystHourlyRate, minutesPerAlert } = useMemo(
    () => ({
      minutesPerAlert: settings.client.get<number>(SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES),
      analystHourlyRate: settings.client.get<number>(SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE),
    }),
    [settings.client]
  );

  const data = useValueReportData({ from, to, minutesPerAlert, analystHourlyRate });

  useEffect(() => {
    if (data.isLoading || data.isSample || !setReportInputForExportContext || isSourcererLoading) {
      return;
    }
    setReportInputForExportContext({
      attackAlertIds: data.attackAlertIds,
      valueMetrics: data.valueMetrics,
      valueMetricsCompare: data.valueMetricsCompare,
      analystHourlyRate: data.analystHourlyRate,
      minutesPerAlert: data.minutesPerAlert,
    });
  }, [data, setReportInputForExportContext, isSourcererLoading]);

  useEffect(() => {
    setHasReportData(!data.isSample && data.valueMetrics.attackDiscoveryCount > 0);
  }, [data.isSample, data.valueMetrics, setHasReportData]);

  if (data.isLoading || isSourcererLoading) {
    return <PageLoader />;
  }

  if (data.isSample) {
    // render sample report with default values if there are no attack discoveries
    // to show the full report layout and provide an example of how the metrics are calculated
    return (
      <>
        {/*
         * TODO: This is a placeholder CTA. Once https://github.com/elastic/kibana/pull/267971
         * is merged, this will be replaced with the correct banner.
         */}
        <SampleAttackDiscoveryCta />
        <EuiSpacer size="l" />
        <EuiPanel hasBorder={true} borderRadius="m" color="transparent" paddingSize="l">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle
                size="s"
                css={css`
                  text-align: left;
                `}
              >
                <h3>{i18n.WHAT_REPORT_WILL_LOOK_LIKE_TEXT}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge
                color="warning"
                css={css`
                  text-transform: uppercase;
                `}
              >
                {i18n.SAMPLE_DATA_BADGE}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="l" />
          <AIValueReportLayout {...data} />
        </EuiPanel>
      </>
    );
  }

  if (data.hasEverUsedAttackDiscovery && data.valueMetrics.attackDiscoveryCount === 0) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem
          css={css`
            min-height: 50vh;
          `}
        >
          <EuiEmptyPrompt
            icon={<EuiImage size="s" src={analyticsSpeedAcceleration} alt="" />}
            title={<h2>{i18n.NO_RESULTS_TITLE}</h2>}
            titleSize="s"
            body={<p>{i18n.NO_RESULTS_BODY}</p>}
            hasBorder={false}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <AIValueReportLayout {...data} />;
};
