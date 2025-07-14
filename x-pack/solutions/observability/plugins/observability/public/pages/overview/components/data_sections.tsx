/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { APMSection } from './sections/apm/apm_section';
import { LogsSection } from './sections/logs/logs_section';
import { AlertsSection } from './sections/alerts/alerts_section';
import { MetricsSection } from './sections/metrics/metrics_section';
import { UXSection } from './sections/ux/ux_section';
import type { BucketSize } from '../helpers/calculate_bucket_size';

interface Props {
  bucketSize: BucketSize;
}
export type DataSectionsApps = 'alert' | 'infra_logs' | 'infra_metrics' | 'apm' | 'ux';
export const DATA_SECTIONS: readonly DataSectionsApps[] = [
  'alert',
  'infra_logs',
  'infra_metrics',
  'apm',
  'ux',
];

export function DataSections({ bucketSize }: Props) {
  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <AlertsSection bucketSize={bucketSize} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LogsSection bucketSize={bucketSize} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MetricsSection bucketSize={bucketSize} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <APMSection bucketSize={bucketSize} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <UXSection bucketSize={bucketSize} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
