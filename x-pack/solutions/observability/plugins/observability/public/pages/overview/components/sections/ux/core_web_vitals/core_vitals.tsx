/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
import {
  CLS_HELP_LABEL,
  CLS_LABEL,
  INP_HELP_LABEL,
  INP_LABEL,
  LCP_HELP_LABEL,
  LCP_LABEL,
  LEGEND_GOOD_LABEL,
  LEGEND_NEEDS_IMPROVEMENT_LABEL,
  LEGEND_POOR_LABEL,
} from './translations';
import { CoreVitalItem } from './core_vital_item';
import { WebCoreVitalsTitle } from './web_core_vitals_title';
import { ServiceName } from './service_name';

export interface CoreVitalProps {
  loading: boolean;
  data?: UXMetrics | null;
  displayServiceName?: boolean;
  serviceName?: string;
  totalPageViews?: number;
  displayTrafficMetric?: boolean;
  layout?: 'row' | 'column';
}

function formatToSec(value?: number | string, fromUnit = 'MicroSec'): string {
  const valueInMs = Number(value ?? 0) / (fromUnit === 'MicroSec' ? 1000 : 1);

  if (valueInMs < 1000) {
    return valueInMs.toFixed(0) + ' ms';
  }
  return (valueInMs / 1000).toFixed(2) + ' s';
}

function formatToMilliseconds(value?: number | null) {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }
  return formatToSec(value, 'ms');
}

const CoreVitalsThresholds = {
  LCP: { good: '2.5s', bad: '4.0s' },
  INP: { good: '200ms', bad: '500ms' },
  CLS: { good: '0.1', bad: '0.25' },
};

// eslint-disable-next-line import/no-default-export
export default function CoreVitals({
  data,
  loading,
  displayServiceName,
  serviceName,
  totalPageViews,
  displayTrafficMetric = false,
  layout = 'row',
}: CoreVitalProps) {
  const { lcp, lcpRanks, inp, inpRanks, cls, clsRanks, coreVitalPages } = data || {};
  const isColumn = layout === 'column';

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <WebCoreVitalsTitle
          loading={loading}
          coreVitalPages={coreVitalPages}
          totalPageViews={totalPageViews}
          displayTrafficMetric={displayTrafficMetric}
          hideHeading={isColumn}
        />
      </EuiFlexItem>
      {displayServiceName && (
        <EuiFlexItem grow={false}>
          <ServiceName name={serviceName!} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize={isColumn ? 'm' : 'l'} direction={layout}>
          <EuiFlexItem grow={!isColumn}>
            <CoreVitalItem
              title={LCP_LABEL}
              value={formatToMilliseconds(lcp)}
              ranks={lcpRanks}
              loading={loading}
              thresholds={CoreVitalsThresholds.LCP}
              helpLabel={LCP_HELP_LABEL}
              dataTestSubj={'lcp-core-vital'}
              showLegend={!isColumn}
              compact={isColumn}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={!isColumn}>
            <CoreVitalItem
              title={INP_LABEL}
              value={formatToMilliseconds(inp)}
              ranks={inpRanks}
              loading={loading}
              thresholds={CoreVitalsThresholds.INP}
              helpLabel={INP_HELP_LABEL}
              dataTestSubj={'inp-core-vital'}
              showLegend={!isColumn}
              compact={isColumn}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={!isColumn}>
            <CoreVitalItem
              title={CLS_LABEL}
              value={cls?.toFixed(3) ?? null}
              ranks={clsRanks}
              loading={loading}
              thresholds={CoreVitalsThresholds.CLS}
              isCls={true}
              helpLabel={CLS_HELP_LABEL}
              dataTestSubj={'cls-core-vital'}
              showLegend={!isColumn}
              compact={isColumn}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isColumn && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiHealth color="success">{LEGEND_GOOD_LABEL}</EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color="warning">{LEGEND_NEEDS_IMPROVEMENT_LABEL}</EuiHealth>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiHealth color="danger">{LEGEND_POOR_LABEL}</EuiHealth>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
