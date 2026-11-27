/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { useFormatters } from '../../../hooks/use_formatters';
import { INGEST_LABEL, SESSIONS_LABEL, SESSIONS_UNAVAILABLE_LABEL } from '../../../labels';
import { formatBytes } from '../../../utils/format_bytes';
import { IngestTooltip } from '../components/ingest_tooltip';
import type { ApplicationsSummary } from '../utils/summarize_applications';

/** The ingest tile, which loads apart from the list. */
export interface IngestSummary {
  /** Estimated bytes of the summarized applications; `null` without an estimate. */
  bytes: number | null;
  isLoading: boolean;
  /** Why some applications have no estimate. */
  notes: string[];
}

const LABELS = {
  applications: i18n.translate('xpack.digitalExperience.summary.applications', {
    defaultMessage: 'Applications',
  }),
  pageLoads: i18n.translate('xpack.digitalExperience.summary.pageLoads', {
    defaultMessage: 'Page loads',
  }),
  errorsPerPageLoad: i18n.translate('xpack.digitalExperience.summary.errorsPerPageLoad', {
    defaultMessage: 'JS errors per page load',
  }),
  failedHttp: i18n.translate('xpack.digitalExperience.summary.failedHttp', {
    defaultMessage: 'Failed HTTP',
  }),
  poorCoreWebVitals: i18n.translate('xpack.digitalExperience.summary.poorCoreWebVitals', {
    defaultMessage: 'Poor Core Web Vitals',
  }),
};

/** The totals of the listed applications; the values keep their size while loading. */
export function ApplicationsSummaryPanel({
  summary,
  isLoading,
  ingest,
}: {
  summary: ApplicationsSummary;
  isLoading: boolean;
  ingest: IngestSummary;
}) {
  const { formatNumber, formatPercent } = useFormatters();
  const stats: Array<{
    id: string;
    label: ReactNode;
    value: ReactNode;
    color?: 'danger';
    /** A tile that loads apart from the list. */
    isLoading?: boolean;
  }> = [
    { id: 'applications', label: LABELS.applications, value: formatNumber(summary.applications) },
    {
      id: 'ingest',
      // Always a tooltip: the value is an estimate, and how it is made matters.
      label: (
        <EuiToolTip content={<IngestTooltip notes={ingest.notes} />}>
          <span tabIndex={0} data-test-subj="digitalExperienceSummaryIngestLabel">
            {INGEST_LABEL}
          </span>
        </EuiToolTip>
      ),
      value: ingest.bytes === null ? <EmptyCellValue /> : formatBytes(ingest.bytes),
      isLoading: isLoading || ingest.isLoading,
    },
    {
      id: 'sessions',
      // Without a total, the label says where the sessions come from.
      label:
        summary.sessions === null ? (
          <EuiToolTip content={SESSIONS_UNAVAILABLE_LABEL}>
            <span tabIndex={0}>{SESSIONS_LABEL}</span>
          </EuiToolTip>
        ) : (
          SESSIONS_LABEL
        ),
      value: summary.sessions === null ? <EmptyCellValue /> : formatNumber(summary.sessions),
    },
    { id: 'pageLoads', label: LABELS.pageLoads, value: formatNumber(summary.pageLoads) },
    {
      id: 'errorsPerPageLoad',
      label: LABELS.errorsPerPageLoad,
      value:
        summary.errorsPerPageLoad === null ? (
          <EmptyCellValue />
        ) : (
          summary.errorsPerPageLoad.toFixed(2)
        ),
    },
    {
      id: 'failedHttp',
      label: LABELS.failedHttp,
      value:
        summary.failedHttpRatio === null ? (
          <EmptyCellValue />
        ) : (
          formatPercent(summary.failedHttpRatio)
        ),
    },
    {
      id: 'poorCoreWebVitals',
      label: LABELS.poorCoreWebVitals,
      value: String(summary.poorCoreWebVitals),
      color: summary.poorCoreWebVitals > 0 ? 'danger' : undefined,
    },
  ];

  return (
    <EuiPanel hasBorder data-test-subj="digitalExperienceApplicationsSummary">
      <EuiFlexGroup gutterSize="l" responsive={false} wrap>
        {stats.map(({ id, label, value, color, isLoading: isStatLoading = isLoading }) => (
          <EuiFlexItem key={id}>
            <EuiStat
              data-test-subj={`digitalExperienceSummary-${id}`}
              title={value}
              titleColor={color}
              titleSize="s"
              description={label}
              isLoading={isStatLoading}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
