/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { UXMetrics } from '@kbn/observability-shared-plugin/public';
import type { CoreWebVital, VitalRating } from '../../../../../../../common/core_web_vitals';
import {
  CORE_WEB_VITAL_THRESHOLDS,
  getVitalRating,
} from '../../../../../../../common/core_web_vitals';
import {
  CLS_HELP_LABEL,
  CLS_LABEL,
  INP_HELP_LABEL,
  INP_LABEL,
  LCP_HELP_LABEL,
  LCP_LABEL,
} from './translations';
import type { Thresholds } from './core_vital_item';
import { CoreVitalItem } from './core_vital_item';
import type { CoreVitalsHeadingLevel } from './web_core_vitals_title';
import { WebCoreVitalsTitle } from './web_core_vitals_title';
import { ServiceName } from './service_name';

export interface CoreVitalProps {
  loading: boolean;
  data?: UXMetrics | null;
  displayServiceName?: boolean;
  serviceName?: string;
  totalPageViews?: number;
  displayTrafficMetric?: boolean;
  headingLevel?: CoreVitalsHeadingLevel;
}

function formatToSec(value?: number | string, fromUnit = 'MicroSec'): string {
  const valueInMs = Math.round(Number(value ?? 0) / (fromUnit === 'MicroSec' ? 1000 : 1));

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

const getRating = (vital: CoreWebVital, value?: number | null): VitalRating | undefined =>
  value === undefined || value === null ? undefined : getVitalRating(vital, value);

const formatThresholds = (vital: CoreWebVital, format: (value: number) => string): Thresholds => {
  const { good, needsImprovement } = CORE_WEB_VITAL_THRESHOLDS[vital];
  return { good: format(good), bad: format(needsImprovement) };
};

const CoreVitalsThresholds = {
  LCP: formatThresholds('lcp', (value) => formatToSec(value, 'ms')),
  INP: formatThresholds('inp', (value) => formatToSec(value, 'ms')),
  CLS: formatThresholds('cls', String),
};

// eslint-disable-next-line import/no-default-export
export default function CoreVitals({
  data,
  loading,
  displayServiceName,
  serviceName,
  totalPageViews,
  displayTrafficMetric = false,
  headingLevel,
}: CoreVitalProps) {
  const { lcp, lcpRanks, inp, inpRanks, cls, clsRanks, coreVitalPages } = data || {};

  return (
    <>
      <WebCoreVitalsTitle
        loading={loading}
        coreVitalPages={coreVitalPages}
        totalPageViews={totalPageViews}
        displayTrafficMetric={displayTrafficMetric}
        headingLevel={headingLevel}
      />
      <EuiSpacer size="s" />
      {displayServiceName && <ServiceName name={serviceName!} />}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl" justifyContent={'spaceBetween'} wrap>
        <EuiFlexItem style={{ flexBasis: 380 }}>
          <CoreVitalItem
            title={LCP_LABEL}
            value={formatToMilliseconds(lcp)}
            rating={getRating('lcp', lcp)}
            ranks={lcpRanks}
            loading={loading}
            thresholds={CoreVitalsThresholds.LCP}
            helpLabel={LCP_HELP_LABEL}
            dataTestSubj={'lcp-core-vital'}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ flexBasis: 380 }}>
          <CoreVitalItem
            title={INP_LABEL}
            value={formatToMilliseconds(inp)}
            rating={getRating('inp', inp)}
            ranks={inpRanks}
            loading={loading}
            thresholds={CoreVitalsThresholds.INP}
            helpLabel={INP_HELP_LABEL}
            dataTestSubj={'inp-core-vital'}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ flexBasis: 380 }}>
          <CoreVitalItem
            title={CLS_LABEL}
            value={cls?.toFixed(3) ?? null}
            rating={getRating('cls', cls)}
            ranks={clsRanks}
            loading={loading}
            thresholds={CoreVitalsThresholds.CLS}
            isCls={true}
            helpLabel={CLS_HELP_LABEL}
            dataTestSubj={'cls-core-vital'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
