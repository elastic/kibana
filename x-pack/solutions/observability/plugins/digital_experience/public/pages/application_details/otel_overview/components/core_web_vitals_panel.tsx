/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import { getCoreVitalsComponent } from '@kbn/observability-plugin/public';
import type { DurationVital, WebVitals } from '../../../../../common/types/applications';
import { formatDurationMs } from '../../../../utils/format_duration';
import { toUxMetrics } from '../utils/to_ux_metrics';

const OTHER_METRICS_TITLE = i18n.translate(
  'xpack.digitalExperience.overview.vitals.otherMetricsTitle',
  { defaultMessage: 'Other page load metrics' }
);

const OTHER_METRICS_HINT = i18n.translate(
  'xpack.digitalExperience.overview.vitals.otherMetricsHint',
  {
    defaultMessage:
      'The 75th percentile of each metric over its web vital samples in the time range.',
  }
);

const FCP_HINT = i18n.translate('xpack.digitalExperience.overview.vitals.fcpHint', {
  defaultMessage:
    'First Contentful Paint: how long after the navigation started the browser first painted content. 75th percentile of the first-contentful-paint web vital samples.',
});

const TTFB_HINT = i18n.translate('xpack.digitalExperience.overview.vitals.ttfbHint', {
  defaultMessage:
    'Time to First Byte: how long after the navigation started the browser received the first byte of the response. 75th percentile of the time-to-first-byte web vital samples.',
});

const FCP_LABEL = i18n.translate('xpack.digitalExperience.overview.vitals.fcpLabel', {
  defaultMessage: 'FCP (p75)',
});

const TTFB_LABEL = i18n.translate('xpack.digitalExperience.overview.vitals.ttfbLabel', {
  defaultMessage: 'TTFB (p75)',
});

/** One duration vital's p75, empty without samples. */
function VitalStat({
  label,
  hint,
  vital,
  isLoading,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  /** How the value is calculated. */
  hint: string;
  vital: DurationVital;
  isLoading: boolean;
  'data-test-subj': string;
}) {
  return (
    <EuiFlexItem grow={false}>
      <EuiStat
        data-test-subj={dataTestSubj}
        titleSize="s"
        isLoading={isLoading}
        title={vital.p75Ms === null ? <EmptyCellValue /> : formatDurationMs(vital.p75Ms)}
        description={
          <>
            {label} <EuiIconTip content={hint} type="info" size="s" />
          </>
        }
      />
    </EuiFlexItem>
  );
}

/**
 * The Core Web Vitals of Observability's shared component, plus FCP and TTFB, which it does not
 * show.
 */
export function CoreWebVitalsPanel({
  webVitals,
  isLoading,
}: {
  webVitals: WebVitals;
  isLoading: boolean;
}) {
  const coreVitals = useMemo(
    () =>
      getCoreVitalsComponent({
        headingLevel: 'h2',
        loading: isLoading,
        // No data while loading, so another selection's vitals are never shown as this one's.
        data: isLoading ? null : toUxMetrics(webVitals),
        // The web vital samples are not page views, so the share of traffic they cover is unknown.
        displayTrafficMetric: false,
      }),
    [webVitals, isLoading]
  );

  return (
    <EuiPanel hasBorder data-test-subj="digitalExperienceOverviewVitals">
      {coreVitals}
      <EuiSpacer size="m" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="m" />
      <EuiTitle size="xs">
        <h2>
          {OTHER_METRICS_TITLE} <EuiIconTip content={OTHER_METRICS_HINT} type="info" size="s" />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl" wrap responsive={false}>
        <VitalStat
          data-test-subj="digitalExperienceOverviewFcp"
          label={FCP_LABEL}
          hint={FCP_HINT}
          vital={webVitals.fcp}
          isLoading={isLoading}
        />
        <VitalStat
          data-test-subj="digitalExperienceOverviewTtfb"
          label={TTFB_LABEL}
          hint={TTFB_HINT}
          vital={webVitals.ttfb}
          isLoading={isLoading}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
