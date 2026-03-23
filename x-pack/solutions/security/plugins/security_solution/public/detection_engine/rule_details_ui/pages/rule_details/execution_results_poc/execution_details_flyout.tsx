/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiCodeBlock,
  EuiStat,
  EuiDescriptionList,
  EuiAccordion,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import type {
  UnifiedExecutionResult,
  RuleExecutionStatus,
  UnifiedExecutionStatus,
} from '../../../../../../common/api/detection_engine/rule_monitoring';
import { ExecutionStatusIndicator } from '../../../../rule_monitoring';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import { RuleDurationFormat } from '../execution_log_table/rule_duration_format';
import {
  RULE_EXECUTION_TYPE_BACKFILL,
  RULE_EXECUTION_TYPE_STANDARD,
} from '../../../../../common/translations';
import * as i18n from './translations';

const UNIFIED_TO_RULE_STATUS: Record<UnifiedExecutionStatus, RuleExecutionStatus> = {
  success: 'succeeded',
  warning: 'partial failure',
  failure: 'failed',
};

const AccordionButtonContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiTitle size="xxs">
    <span>{children}</span>
  </EuiTitle>
);

interface ExecutionDetailsFlyoutProps {
  item: UnifiedExecutionResult;
  onClose: () => void;
}

export const ExecutionDetailsFlyout: React.FC<ExecutionDetailsFlyoutProps> = ({
  item,
  onClose,
}) => {
  const { euiTheme } = useEuiTheme();
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'flyoutTitle' });
  const summaryAccordionId = useGeneratedHtmlId({ prefix: 'executionSummary' });
  const alertsAccordionId = useGeneratedHtmlId({ prefix: 'alerts' });
  const metricsAccordionId = useGeneratedHtmlId({ prefix: 'executionMetrics' });
  const durationAccordionId = useGeneratedHtmlId({ prefix: 'durationBreakdown' });

  const alertCount = item.metrics.alert_counts?.new ?? 0;
  const candidateCount = item.metrics.alerts_candidate_count;
  const gapSeconds = item.metrics.execution_gap_duration_s;

  const separatorCss = { borderLeft: `${euiTheme.border.thin}` };

  const hasDurationBreakdown =
    item.metrics.total_search_duration_ms != null ||
    item.metrics.total_indexing_duration_ms != null ||
    item.metrics.index_duration_ms != null;

  const additionalMetrics = [
    ...(item.metrics.frozen_indices_queried_count != null
      ? [
          {
            title: i18n.FLYOUT_FROZEN_INDICES_QUERIED,
            description: String(item.metrics.frozen_indices_queried_count),
          },
        ]
      : []),
    ...(item.backfill
      ? [
          {
            title: i18n.FLYOUT_SOURCE_EVENT_TIME_RANGE,
            description: (
              <>
                <FormattedDate value={item.backfill.from} fieldName="from" />
                {' — '}
                <FormattedDate value={item.backfill.to} fieldName="to" />
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiFlyout onClose={onClose} size="s" ownFocus aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={flyoutTitleId}>
          <h2>{i18n.FLYOUT_TITLE(item.execution_uuid.slice(0, 8))}</h2>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          <FormattedDate value={item.execution_start} fieldName="execution_start" />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiPanel hasBorder paddingSize="m">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{i18n.FLYOUT_HEADER_STATUS}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <ExecutionStatusIndicator
                status={UNIFIED_TO_RULE_STATUS[item.outcome.status]}
                showTooltip={false}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={separatorCss} />
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{i18n.FLYOUT_HEADER_RUN_TYPE}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s">
                {item.backfill ? RULE_EXECUTION_TYPE_BACKFILL : RULE_EXECUTION_TYPE_STANDARD}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {/* --- Message --- */}
        {item.outcome.message && (
          <>
            <EuiAccordion
              id={summaryAccordionId}
              buttonContent={
                <AccordionButtonContent>{i18n.FLYOUT_ACCORDION_MESSAGE}</AccordionButtonContent>
              }
              initialIsOpen
            >
              <EuiSpacer size="s" />
              <EuiCodeBlock isCopyable whiteSpace="pre-wrap" paddingSize="m">
                {item.outcome.message}
              </EuiCodeBlock>
            </EuiAccordion>
            <EuiSpacer size="m" />
          </>
        )}

        {/* --- Alerts --- */}
        <EuiAccordion
          id={alertsAccordionId}
          buttonContent={
            <AccordionButtonContent>{i18n.FLYOUT_ACCORDION_ALERTS}</AccordionButtonContent>
          }
          initialIsOpen
        >
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <EuiStat
                  title={alertCount}
                  description={i18n.FLYOUT_ALERTS_LABEL}
                  titleSize="l"
                  reverse
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={{ alignSelf: 'stretch', ...separatorCss }} />
              <EuiFlexItem>
                {item.metrics.matched_indices_count != null && (
                  <EuiText size="s">
                    <strong>{item.metrics.matched_indices_count}</strong>{' '}
                    {i18n.FLYOUT_MATCHED_INDICES}
                  </EuiText>
                )}
                {candidateCount != null && (
                  <EuiText size="s">
                    <strong>{candidateCount}</strong> {i18n.FLYOUT_EVENTS_MATCHED}
                  </EuiText>
                )}
                <EuiText size="s">
                  <strong>{alertCount}</strong> {i18n.FLYOUT_CANDIDATE_ALERTS}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiAccordion>
        <EuiSpacer size="m" />

        {/* --- Execution Metrics --- */}
        <EuiAccordion
          id={metricsAccordionId}
          buttonContent={
            <AccordionButtonContent>
              {i18n.FLYOUT_ACCORDION_EXECUTION_METRICS}
            </AccordionButtonContent>
          }
          initialIsOpen
        >
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup wrap>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{i18n.FLYOUT_EXECUTION_TIME}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  <RuleDurationFormat duration={item.execution_duration_ms} />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={separatorCss} />
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{i18n.FLYOUT_GAP_DETECTED}</strong>
                </EuiText>
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  {gapSeconds != null && gapSeconds > 0 ? `${gapSeconds}s` : '—'}
                </EuiText>
              </EuiFlexItem>
              {item.schedule_delay_ms != null && (
                <>
                  <EuiFlexItem grow={false} css={separatorCss} />
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{i18n.FLYOUT_SCHEDULING_DELAY}</strong>
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiText size="s">
                      <RuleDurationFormat duration={item.schedule_delay_ms} />
                    </EuiText>
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiPanel>

          {additionalMetrics.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiDescriptionList listItems={additionalMetrics} type="column" compressed />
            </>
          )}
        </EuiAccordion>

        {/* --- Duration Breakdown --- */}
        {hasDurationBreakdown && (
          <>
            <EuiSpacer size="m" />
            <EuiAccordion
              id={durationAccordionId}
              buttonContent={
                <AccordionButtonContent>
                  {i18n.FLYOUT_ACCORDION_DURATION_BREAKDOWN}
                </AccordionButtonContent>
              }
              initialIsOpen
            >
              <EuiSpacer size="s" />
              <EuiPanel hasBorder paddingSize="m">
                <EuiFlexGroup>
                  {item.metrics.total_search_duration_ms != null && (
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{i18n.FLYOUT_SEARCH_DURATION}</strong>
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <EuiText size="s">
                        <RuleDurationFormat duration={item.metrics.total_search_duration_ms} />
                      </EuiText>
                    </EuiFlexItem>
                  )}
                  {item.metrics.total_indexing_duration_ms != null && (
                    <>
                      <EuiFlexItem grow={false} css={separatorCss} />
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{i18n.FLYOUT_INDEX_DURATION}</strong>
                        </EuiText>
                        <EuiSpacer size="xs" />
                        <EuiText size="s">
                          <RuleDurationFormat duration={item.metrics.total_indexing_duration_ms} />
                        </EuiText>
                      </EuiFlexItem>
                    </>
                  )}
                  {item.metrics.index_duration_ms != null && (
                    <>
                      <EuiFlexItem grow={false} css={separatorCss} />
                      <EuiFlexItem>
                        <EuiText size="s">
                          <strong>{i18n.FLYOUT_ALERT_INDEX_DURATION}</strong>
                        </EuiText>
                        <EuiSpacer size="xs" />
                        <EuiText size="s">
                          <RuleDurationFormat duration={item.metrics.index_duration_ms} />
                        </EuiText>
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>
              </EuiPanel>
            </EuiAccordion>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
