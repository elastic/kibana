/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { useFormatters } from '../../../hooks/use_formatters';
import type { ApplicationsSummary } from '../utils/summarize_applications';

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
}: {
  summary: ApplicationsSummary;
  isLoading: boolean;
}) {
  const { formatNumber, formatPercent } = useFormatters();
  const stats: Array<{ id: string; label: string; value: ReactNode; color?: 'danger' }> = [
    { id: 'applications', label: LABELS.applications, value: formatNumber(summary.applications) },
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
        {stats.map(({ id, label, value, color }) => (
          <EuiFlexItem key={id}>
            <EuiStat
              data-test-subj={`digitalExperienceSummary-${id}`}
              title={value}
              titleColor={color}
              titleSize="s"
              description={label}
              isLoading={isLoading}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
