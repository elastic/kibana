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
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
  useGeneratedHtmlId,
  useEuiTheme,
} from '@elastic/eui';
import type { UnifiedExecutionResult } from '../../../../../../common/api/detection_engine/rule_monitoring';
import { ExecutionStatusIndicator } from '../../../../rule_monitoring';
import { FormattedDate } from '../../../../../common/components/formatted_date';
import {
  RULE_EXECUTION_TYPE_BACKFILL,
  RULE_EXECUTION_TYPE_STANDARD,
} from '../../../../../common/translations';
import * as i18n from './translations';
import { UNIFIED_TO_RULE_STATUS } from './columns';
import { MessageSection } from './sections/message_section';
import { BackfillSection } from './sections/backfill_section';
import { AlertsSection } from './sections/alerts_section';
import { IndicesSection } from './sections/indices_section';
import { ExecutionMetricsSection } from './sections/execution_metrics_section';
import { DurationBreakdownSection } from './sections/duration_breakdown_section';

const EXECUTION_DETAILS_FLYOUT_WIDTH = 600;

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

  const alertCount = item.metrics.alert_counts?.new ?? 0;
  const candidateCount = item.metrics.alerts_candidate_count;
  const gapSeconds = item.metrics.execution_gap_duration_s;

  const separatorCss = { borderLeft: `${euiTheme.border.thin}` };

  return (
    <EuiFlyout
      onClose={onClose}
      size={EXECUTION_DETAILS_FLYOUT_WIDTH}
      ownFocus
      aria-labelledby={flyoutTitleId}
      data-test-subj="executionDetailsFlyout"
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
              <span data-test-subj="executionDetailsFlyoutHeaderStatus">
                <ExecutionStatusIndicator
                  status={UNIFIED_TO_RULE_STATUS[item.outcome.status]}
                  showTooltip={false}
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={separatorCss} />
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{i18n.FLYOUT_HEADER_RUN_TYPE}</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="s" data-test-subj="executionDetailsFlyoutHeaderRunType">
                {item.backfill ? RULE_EXECUTION_TYPE_BACKFILL : RULE_EXECUTION_TYPE_STANDARD}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {item.outcome.message && (
          <>
            <MessageSection message={item.outcome.message} />
            <EuiSpacer size="m" />
          </>
        )}

        {item.backfill && (
          <>
            <BackfillSection backfill={item.backfill} />
            <EuiSpacer size="m" />
          </>
        )}

        <AlertsSection alertCount={alertCount} candidateCount={candidateCount} />
        <EuiSpacer size="m" />

        <IndicesSection
          matchedIndicesCount={item.metrics.matched_indices_count}
          frozenIndicesQueriedCount={item.metrics.frozen_indices_queried_count}
        />
        <EuiSpacer size="m" />

        <ExecutionMetricsSection
          gapSeconds={gapSeconds}
          scheduleDelayMs={item.schedule_delay_ms}
          executionDurationMs={item.execution_duration_ms}
        />

        <EuiSpacer size="m" />
        <DurationBreakdownSection
          totalSearchDurationMs={item.metrics.total_search_duration_ms}
          totalIndexingDurationMs={item.metrics.total_indexing_duration_ms}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
