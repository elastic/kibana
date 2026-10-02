/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import { css } from '@emotion/css';
import { getMemoryArchiveReasonLabel } from './labels';
import type { MemoryPage } from './types';

const asPercent = (value: number): number => Math.round(Math.max(0, Math.min(1, value)) * 100);

interface MemoryTelemetryPanelProps {
  page: MemoryPage;
  usefulness: number;
  confidence: number;
}

/**
 * The two numbers the investigator's own ranking reasons about.
 *
 * A 0% usefulness means "never surfaced", not "useless" — a brand-new memory is
 * 0% by definition — so it is rendered as plain text rather than a warning.
 */
export function MemoryTelemetryPanel({ page, usefulness, confidence }: MemoryTelemetryPanelProps) {
  return (
    <EuiFlexGroup gutterSize="l" wrap responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.telemetry.usefulnessLabel"
            defaultMessage="Usefulness"
          />
        </EuiText>
        {/* No colour prop: 0% means "never surfaced", which is the normal state for
            a new memory, so painting it as a warning would cry wolf on every cold
            start. The data-test-subj is what a test asserts against. */}
        <EuiText size="s" data-test-subj="nightshiftMemoryUsefulnessValue">
          <FormattedNumber value={asPercent(usefulness)} />%
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.significantEventsApp.memory.telemetry.confidenceLabel"
            defaultMessage="Confidence"
          />
        </EuiText>
        <EuiText size="s" data-test-subj="nightshiftMemoryConfidenceValue">
          <FormattedNumber value={asPercent(confidence)} />%
        </EuiText>
      </EuiFlexItem>
      {page.archived && page.archive_reason !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow" data-test-subj="nightshiftMemoryArchivedBadge">
            {getMemoryArchiveReasonLabel(page.archive_reason)}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {page.tags.length > 0 && (
        <EuiFlexItem
          className={css`
            display: flex;
            /* The surrounding group is a column, so set the row direction here
               explicitly; otherwise each badge stretches to the full width. */
            flex-direction: row;
            flex-wrap: wrap;
            gap: 4px;
          `}
        >
          {page.tags
            .filter((tag) => tag !== 'memory')
            .map((tag) => (
              <EuiBadge key={tag} color="accent">
                {tag}
              </EuiBadge>
            ))}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
