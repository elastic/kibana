/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { i18n as i18nLib } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiInlineEditTitle,
  useEuiTheme,
  useIsWithinMaxBreakpoint,
  EuiSkeletonText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_TITLE } from '@kbn/management-settings-ids';
import { useKibana } from '../../../common/lib/kibana';
import { CostSavings } from './cost_savings';
import { getTimeRangeAsDays, formatDollars, formatThousands } from './metrics';
import * as i18n from './translations';
import type { ValueMetrics } from './metrics';
import { TimeSaved } from './time_saved';
import { FilteringRate } from './filtering_rate';
import { ThreatsDetected } from './threats_detected';
import { useAIValueExportContext } from '../../providers/ai_value/export_provider';

interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
  isLoading: boolean;
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
  isLoading,
  from,
  to,
  valueMetrics,
  valueMetricsCompare,
}) => {
  const { uiSettings } = useKibana().services;
  const [title, setTitle] = useState<string>(
    uiSettings.get(SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_TITLE)
  );
  const updateTitle = useCallback(
    (newTitle: string) => {
      uiSettings.set(SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_TITLE, newTitle);
      setTitle(newTitle);
    },
    [uiSettings]
  );
  const onTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      updateTitle(e.target.value);
    },
    [updateTitle]
  );
  const aiValueExportContext = useAIValueExportContext();
  const isExportMode = aiValueExportContext?.isExportMode === true;
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
  const isSmall = useIsWithinMaxBreakpoint('m');
  const costSavings = useMemo(
    () => formatDollars(valueMetrics.costSavings),
    [valueMetrics.costSavings]
  );

  const timerangeAsDays = useMemo(() => getTimeRangeAsDays({ from, to }), [from, to]);

  const {
    euiTheme: { size },
  } = useEuiTheme();
  return (
    <div
      data-test-subj="executiveSummaryContainer"
      css={css`
        border-radius: ${size.s};
        padding: ${size.base} ${size.xl};
        min-height: 200px;
      `}
    >
      <EuiInlineEditTitle
        isReadOnly={isExportMode}
        className="executiveSummaryTitle"
        data-test-subj="executiveSummaryTitle"
        size="l"
        heading="h1"
        inputAriaLabel={i18n.EDIT_TITLE}
        value={title}
        onChange={onTitleChange}
        onCancel={(previousValue) => {
          updateTitle(previousValue);
        }}
      />

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
            <EuiText size="s" color="subdued">
              {isLoading ? (
                <EuiSkeletonText lines={3} size="s" isLoading={true} />
              ) : hasAttackDiscoveries ? (
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
              ) : (
                <p data-test-subj="executiveSummaryNoAttacks">
                  {i18n.EXECUTIVE_MESSAGE_NO_ATTACKS}
                </p>
              )}
            </EuiText>
          </span>
        </EuiFlexItem>

        {/* Right side - Only Cost Savings card */}
        {(isLoading || hasAttackDiscoveries) && (
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
      {(isLoading || hasAttackDiscoveries) && (
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
