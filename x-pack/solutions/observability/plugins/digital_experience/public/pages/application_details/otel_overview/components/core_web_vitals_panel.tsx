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

const FCP_LABEL = i18n.translate('xpack.digitalExperience.overview.vitals.fcpLabel', {
  defaultMessage: 'FCP (p75)',
});

const TTFB_LABEL = i18n.translate('xpack.digitalExperience.overview.vitals.ttfbLabel', {
  defaultMessage: 'TTFB (p75)',
});

/** One duration vital's p75, empty without samples. */
function VitalStat({
  label,
  vital,
  isLoading,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
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
        description={label}
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
        <h2>{OTHER_METRICS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl" wrap responsive={false}>
        <VitalStat
          data-test-subj="digitalExperienceOverviewFcp"
          label={FCP_LABEL}
          vital={webVitals.fcp}
          isLoading={isLoading}
        />
        <VitalStat
          data-test-subj="digitalExperienceOverviewTtfb"
          label={TTFB_LABEL}
          vital={webVitals.ttfb}
          isLoading={isLoading}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
