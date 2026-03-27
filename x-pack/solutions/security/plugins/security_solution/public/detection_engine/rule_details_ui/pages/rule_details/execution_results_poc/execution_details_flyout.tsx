/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiCodeBlock,
  EuiAccordion,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
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

const EXECUTION_DETAILS_FLYOUT_WIDTH = 600;

const tooltipListCss = css`
  list-style: disc;
  padding-left: 16px;
  margin: 0;

  li + li {
    margin-top: 4px;
  }
`;

const UNIFIED_TO_RULE_STATUS: Record<UnifiedExecutionStatus, RuleExecutionStatus> = {
  success: 'succeeded',
  warning: 'partial failure',
  failure: 'failed',
};

const AccordionButtonContent: React.FC<{
  children: React.ReactNode;
  tooltip?: React.ReactNode;
}> = ({ children, tooltip }) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <span>{children}</span>
      </EuiTitle>
    </EuiFlexItem>
    {tooltip && (
      <EuiFlexItem grow={false}>
        <EuiIconTip content={tooltip} type="question" color="subdued" />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

const FieldLabel: React.FC<{ label: string }> = ({ label }) => (
  <EuiText size="s">
    <strong>{label}</strong>
  </EuiText>
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
  const sourceEventTimeRangeAccordionId = useGeneratedHtmlId({ prefix: 'sourceEventTimeRange' });
  const indicesAccordionId = useGeneratedHtmlId({ prefix: 'indices' });
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

  return (
    <EuiFlyout
      onClose={onClose}
      size={EXECUTION_DETAILS_FLYOUT_WIDTH}
      ownFocus
      aria-labelledby={flyoutTitleId}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m" id={flyoutTitleId}>
              <h2>{i18n.FLYOUT_TITLE(item.execution_uuid?.slice(0, 8) ?? '—')}</h2>
            </EuiTitle>
          </EuiFlexItem>
          {item.execution_uuid != null && (
            <EuiFlexItem grow={false}>
              <EuiCopy
                textToCopy={item.execution_uuid}
                beforeMessage={i18n.FLYOUT_COPY_EXECUTION_ID}
              >
                {(copy) => (
                  <EuiButtonIcon
                    onClick={copy}
                    iconType="copy"
                    color="text"
                    aria-label={i18n.FLYOUT_COPY_EXECUTION_ID}
                  />
                )}
              </EuiCopy>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
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

        {/* --- Source event time range --- */}
        {item.backfill && (
          <>
            <EuiAccordion
              id={sourceEventTimeRangeAccordionId}
              buttonContent={
                <AccordionButtonContent
                  tooltip={
                    <ul css={tooltipListCss}>
                      <li>
                        <strong>
                          {i18n.FLYOUT_FROM}
                          {':'}
                        </strong>{' '}
                        {i18n.FLYOUT_TOOLTIP_FROM}
                      </li>
                      <li>
                        <strong>
                          {i18n.FLYOUT_TO}
                          {':'}
                        </strong>{' '}
                        {i18n.FLYOUT_TOOLTIP_TO}
                      </li>
                    </ul>
                  }
                >
                  {i18n.FLYOUT_ACCORDION_SOURCE_EVENT_TIME_RANGE}
                </AccordionButtonContent>
              }
              initialIsOpen
            >
              <EuiSpacer size="s" />
              <EuiPanel hasBorder paddingSize="m">
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <FieldLabel label={i18n.FLYOUT_FROM} />
                    <EuiSpacer size="xs" />
                    <EuiText size="s">
                      <FormattedDate value={item.backfill.from} fieldName="from" />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} css={separatorCss} />
                  <EuiFlexItem>
                    <FieldLabel label={i18n.FLYOUT_TO} />
                    <EuiSpacer size="xs" />
                    <EuiText size="s">
                      <FormattedDate value={item.backfill.to} fieldName="to" />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiAccordion>
            <EuiSpacer size="m" />
          </>
        )}

        {/* --- Alerts --- */}
        <EuiAccordion
          id={alertsAccordionId}
          buttonContent={
            <AccordionButtonContent
              tooltip={
                <ul css={tooltipListCss}>
                  <li>
                    <strong>
                      {i18n.COLUMN_ALERTS_CREATED}
                      {':'}
                    </strong>{' '}
                    {i18n.FLYOUT_TOOLTIP_ALERTS_CREATED}
                  </li>
                  <li>
                    <strong>
                      {i18n.FLYOUT_CANDIDATE_ALERTS}
                      {':'}
                    </strong>{' '}
                    {i18n.FLYOUT_TOOLTIP_CANDIDATE_ALERTS}
                  </li>
                </ul>
              }
            >
              {i18n.FLYOUT_ACCORDION_ALERTS}
            </AccordionButtonContent>
          }
          initialIsOpen
        >
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup>
              <EuiFlexItem>
                <FieldLabel label={i18n.COLUMN_ALERTS_CREATED} />
                <EuiSpacer size="xs" />
                <EuiText size="s">{alertCount}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={separatorCss} />
              <EuiFlexItem>
                <FieldLabel label={i18n.FLYOUT_CANDIDATE_ALERTS} />
                <EuiSpacer size="xs" />
                <EuiText size="s">{candidateCount ?? '—'}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiAccordion>
        <EuiSpacer size="m" />

        {/* --- Indices --- */}
        <EuiAccordion
          id={indicesAccordionId}
          buttonContent={
            <AccordionButtonContent
              tooltip={
                <ul css={tooltipListCss}>
                  <li>
                    <strong>
                      {i18n.FLYOUT_MATCHED_INDICES}
                      {':'}
                    </strong>{' '}
                    {i18n.FLYOUT_TOOLTIP_MATCHED_INDICES}
                  </li>
                  <li>
                    <strong>
                      {i18n.FLYOUT_FROZEN_INDICES_QUERIED}
                      {':'}
                    </strong>{' '}
                    {i18n.FLYOUT_TOOLTIP_FROZEN_INDICES_QUERIED}
                  </li>
                </ul>
              }
            >
              {i18n.FLYOUT_ACCORDION_INDICES}
            </AccordionButtonContent>
          }
          initialIsOpen
        >
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup>
              <EuiFlexItem>
                <FieldLabel label={i18n.FLYOUT_MATCHED_INDICES} />
                <EuiSpacer size="xs" />
                <EuiText size="s">{item.metrics.matched_indices_count ?? '—'}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false} css={separatorCss} />
              <EuiFlexItem>
                <FieldLabel label={i18n.FLYOUT_FROZEN_INDICES_QUERIED} />
                <EuiSpacer size="xs" />
                <EuiText size="s">{item.metrics.frozen_indices_queried_count ?? '—'}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiAccordion>
        <EuiSpacer size="m" />

        {/* --- Execution Metrics --- */}
        <EuiAccordion
          id={metricsAccordionId}
          buttonContent={
            <AccordionButtonContent
              tooltip={
                <ul css={tooltipListCss}>
                  <li>
                    <strong>
                      {i18n.FLYOUT_GAP_DURATION}
                      {':'}
                    </strong>{' '}
                    {i18n.FLYOUT_TOOLTIP_GAP_DURATION}
                  </li>
                  <li>
                    <strong>
                      {i18n.FLYOUT_SCHEDULING_DELAY}
                      {':'}
                    </strong>{' '}
                    {i18n.FLYOUT_TOOLTIP_SCHEDULING_DELAY}
                  </li>
                  <li>
                    <strong>
                      {i18n.COLUMN_DURATION}
                      {':'}
                    </strong>{' '}
                    {i18n.FLYOUT_TOOLTIP_EXECUTION_DURATION}
                  </li>
                </ul>
              }
            >
              {i18n.FLYOUT_ACCORDION_EXECUTION_METRICS}
            </AccordionButtonContent>
          }
          initialIsOpen
        >
          <EuiSpacer size="s" />
          <EuiPanel hasBorder paddingSize="m">
            <EuiFlexGroup wrap>
              <EuiFlexItem>
                <FieldLabel label={i18n.FLYOUT_GAP_DURATION} />
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  {gapSeconds != null && gapSeconds > 0 ? (
                    <RuleDurationFormat duration={gapSeconds * 1000} />
                  ) : (
                    '—'
                  )}
                </EuiText>
              </EuiFlexItem>
              {item.schedule_delay_ms != null && (
                <>
                  <EuiFlexItem grow={false} css={separatorCss} />
                  <EuiFlexItem>
                    <FieldLabel label={i18n.FLYOUT_SCHEDULING_DELAY} />
                    <EuiSpacer size="xs" />
                    <EuiText size="s">
                      <RuleDurationFormat duration={item.schedule_delay_ms} />
                    </EuiText>
                  </EuiFlexItem>
                </>
              )}
              <EuiFlexItem grow={false} css={separatorCss} />
              <EuiFlexItem>
                <FieldLabel label={i18n.COLUMN_DURATION} />
                <EuiSpacer size="xs" />
                <EuiText size="s">
                  {item.execution_duration_ms != null ? (
                    <RuleDurationFormat duration={item.execution_duration_ms} />
                  ) : (
                    '—'
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiAccordion>

        {/* --- Duration Breakdown --- */}
        {hasDurationBreakdown && (
          <>
            <EuiSpacer size="m" />
            <EuiAccordion
              id={durationAccordionId}
              buttonContent={
                <AccordionButtonContent
                  tooltip={
                    <ul css={tooltipListCss}>
                      <li>
                        <strong>
                          {i18n.FLYOUT_SEARCH_DURATION}
                          {':'}
                        </strong>{' '}
                        {i18n.FLYOUT_TOOLTIP_SEARCH_DURATION}
                      </li>
                      <li>
                        <strong>
                          {i18n.FLYOUT_INDEX_DURATION}
                          {':'}
                        </strong>{' '}
                        {i18n.FLYOUT_TOOLTIP_INDEXING_TOTAL}
                      </li>
                      <li>
                        <strong>
                          {i18n.FLYOUT_ALERT_INDEX_DURATION}
                          {':'}
                        </strong>{' '}
                        {i18n.FLYOUT_TOOLTIP_INDEXING_ALERTS}
                      </li>
                    </ul>
                  }
                >
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
                      <FieldLabel label={i18n.FLYOUT_SEARCH_DURATION} />
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
                        <FieldLabel label={i18n.FLYOUT_INDEX_DURATION} />
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
                        <FieldLabel label={i18n.FLYOUT_ALERT_INDEX_DURATION} />
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
