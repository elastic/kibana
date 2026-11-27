/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CORE_WEB_VITAL, CORE_WEB_VITALS } from '../../../../../common/core_web_vitals';
import type { CoreWebVital } from '../../../../../common/core_web_vitals';
import { vitalTrendQuery } from '../../../../../common/vitals_trend_esql';
import { useEnvironment } from '../../../../hooks/use_environment';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useOverviewFilters } from '../../../../hooks/use_overview_filters';
import { useOverviewKuery } from '../../../../hooks/use_overview_search';
import { usePersistedChoice } from '../../../../hooks/use_persisted_choice';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { VITAL_LABELS } from '../../../../utils/web_vitals';
import { vitalTrendAttributes, vitalTrendConfig } from '../utils/vital_trend_lens';

const VITAL_STORAGE_KEY = 'xpack.digitalExperience.overview.vitalTrend';

const TITLE = i18n.translate('xpack.digitalExperience.overview.vitalTrend.title', {
  defaultMessage: 'Core Web Vitals over time',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.overview.vitalTrend.subtitle', {
  defaultMessage:
    'The 75th percentile of the vital over the selected range. Below the green band is good, above the red one is poor.',
});

const VITAL_LEGEND = i18n.translate('xpack.digitalExperience.overview.vitalTrend.vitalLegend', {
  defaultMessage: 'Web vital',
});

const chartTitle = (vital: CoreWebVital) =>
  i18n.translate('xpack.digitalExperience.overview.vitalTrend.chartTitle', {
    defaultMessage: '{vital} (p75)',
    values: { vital: VITAL_LABELS[vital] },
  });

const VITAL_OPTIONS = CORE_WEB_VITALS.map((vital) => ({
  id: vital,
  label: VITAL_LABELS[vital],
  'data-test-subj': `digitalExperienceOverviewVitalTrend-${vital}`,
}));

const CHART_HEIGHT = 220;

/**
 * One web vital's p75 over the time range, against Google's thresholds, as a Lens chart: it reads
 * the Overview's application, environment, filters, KQL query and range, and has Lens's actions
 * (Inspect, Open in Discover, Add to dashboard). None where Lens is disabled.
 */
export function VitalsTrendPanel({
  serviceName,
  lastReloadRequestTime,
}: {
  serviceName: string;
  /**
   * When the Overview's Refresh was last clicked: a relative range like `now-24h` stays the same
   * strings, so without it the chart would keep its data while the other panels reload.
   */
  lastReloadRequestTime?: number;
}) {
  const { lens } = useKibanaServices();
  const { euiTheme } = useEuiTheme();
  const { environment } = useEnvironment();
  const { filters } = useOverviewFilters();
  const { kuery } = useOverviewKuery();
  const {
    timeRange: { rangeFrom, rangeTo },
  } = useTimeRange();
  const [vital, setVital] = usePersistedChoice<CoreWebVital>(
    VITAL_STORAGE_KEY,
    CORE_WEB_VITALS,
    CORE_WEB_VITAL.lcp
  );

  const attributes = useMemo(
    () =>
      vitalTrendAttributes(
        vitalTrendConfig({
          vital,
          title: chartTitle(vital),
          query: vitalTrendQuery(vital, { serviceName, environment, filters }),
          colors: {
            line: euiTheme.colors.vis.euiColorVis0,
            good: euiTheme.colors.success,
            poor: euiTheme.colors.danger,
          },
        })
      ),
    [vital, serviceName, environment, filters, euiTheme]
  );
  const query = useMemo(() => ({ language: 'kuery', query: kuery ?? '' }), [kuery]);
  const timeRange = useMemo(() => ({ from: rangeFrom, to: rangeTo }), [rangeFrom, rangeTo]);

  if (!lens) {
    return null;
  }
  const { EmbeddableComponent } = lens;

  return (
    <>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder data-test-subj="digitalExperienceOverviewVitalTrend">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexStart" gutterSize="m">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{TITLE}</h2>
            </EuiTitle>
            <EuiText size="xs" color="subdued">
              {SUBTITLE}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={VITAL_LEGEND}
              options={VITAL_OPTIONS}
              idSelected={vital}
              onChange={setVital}
              buttonSize="compressed"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {/* Mounted anew for another vital: the embeddable keeps the title it was mounted with. */}
        <EmbeddableComponent
          key={vital}
          id={`digitalExperienceOverviewVitalTrend-${vital}`}
          attributes={attributes}
          timeRange={timeRange}
          lastReloadRequestTime={lastReloadRequestTime}
          query={query}
          viewMode="view"
          withDefaultActions
          noPadding
          style={{ height: CHART_HEIGHT }}
        />
      </EuiPanel>
    </>
  );
}
