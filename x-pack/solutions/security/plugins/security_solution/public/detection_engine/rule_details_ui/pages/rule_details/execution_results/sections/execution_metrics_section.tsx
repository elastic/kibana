/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from '../translations';
import { AccordionButtonContent, FieldLabel, SectionSeparator, Tooltip } from './shared';
import { humanizeDuration } from '../utils';

interface ExecutionMetricsSectionProps {
  gapSeconds: number | null;
  scheduleDelayMs: number | null;
  executionDurationMs: number | null;
}

export const ExecutionMetricsSection: React.FC<ExecutionMetricsSectionProps> = ({
  gapSeconds,
  scheduleDelayMs,
  executionDurationMs,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'executionMetrics' });

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <AccordionButtonContent
          tooltip={
            <Tooltip
              items={[
                { title: i18n.FLYOUT_GAP_DURATION, description: i18n.FLYOUT_TOOLTIP_GAP_DURATION },
                {
                  title: i18n.FLYOUT_SCHEDULING_DELAY,
                  description: i18n.FLYOUT_TOOLTIP_SCHEDULING_DELAY,
                },
                {
                  title: i18n.COLUMN_DURATION,
                  description: i18n.FLYOUT_TOOLTIP_EXECUTION_DURATION,
                },
              ]}
            />
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
            <EuiText size="s" data-test-subj="executionDetailsFlyoutGapDuration">
              {gapSeconds !== null && gapSeconds > 0 ? humanizeDuration(gapSeconds * 1000) : '—'}
            </EuiText>
          </EuiFlexItem>
          <SectionSeparator />
          <EuiFlexItem>
            <FieldLabel label={i18n.FLYOUT_SCHEDULING_DELAY} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutSchedulingDelay">
              {scheduleDelayMs !== null ? humanizeDuration(scheduleDelayMs) : '—'}
            </EuiText>
          </EuiFlexItem>
          <SectionSeparator />
          <EuiFlexItem>
            <FieldLabel label={i18n.COLUMN_DURATION} />
            <EuiSpacer size="xs" />
            <EuiText size="s" data-test-subj="executionDetailsFlyoutExecutionDuration">
              {executionDurationMs !== null ? humanizeDuration(executionDurationMs) : '—'}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
