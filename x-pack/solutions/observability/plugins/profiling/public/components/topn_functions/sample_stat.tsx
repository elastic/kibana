/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { Label } from './label';

export function SampleStat({
  samples,
  diffSamples,
  totalSamples,
}: {
  samples: number;
  diffSamples?: number;
  totalSamples: number;
}) {
  const samplesLabel = samples.toLocaleString();

  if (diffSamples === undefined || diffSamples === 0 || totalSamples === 0) {
    return <>{samplesLabel}</>;
  }

  const percentDelta = (diffSamples / (samples - diffSamples)) * 100;
  const totalPercentDelta = (diffSamples / totalSamples) * 100;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>{samplesLabel}</EuiFlexItem>
      <EuiFlexItem>
        <Label value={percentDelta} append=" rel" />
      </EuiFlexItem>
      <EuiFlexItem>
        <Label value={totalPercentDelta} append=" abs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
