/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiStat, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Label } from './label';
import { scaleValue } from './utils';

interface Props {
  baselineTotalSamples: number;
  baselineScaleFactor?: number;
  comparisonTotalSamples?: number;
  comparisonScaleFactor?: number;
}

export function TotalSamplesStat({
  baselineTotalSamples,
  baselineScaleFactor,
  comparisonTotalSamples,
  comparisonScaleFactor,
}: Props) {
  const scaledBaselineTotalSamples = scaleValue({
    value: baselineTotalSamples,
    scaleFactor: baselineScaleFactor,
  });

  const value = scaledBaselineTotalSamples.toLocaleString();

  const sampleHeader = i18n.translate('xpack.profiling.functionsView.totalSampleCountLabel', {
    defaultMessage: ' Total sample estimate: ',
  });

  if (comparisonTotalSamples === undefined || comparisonTotalSamples === 0) {
    return (
      <EuiStat
        title={<EuiText style={{ fontWeight: 'bold' }}>{value}</EuiText>}
        description={sampleHeader}
      />
    );
  }

  const scaledComparisonTotalSamples = scaleValue({
    value: comparisonTotalSamples,
    scaleFactor: comparisonScaleFactor,
  });

  const diffSamples = scaledBaselineTotalSamples - scaledComparisonTotalSamples;
  const percentDelta = (diffSamples / (scaledBaselineTotalSamples - diffSamples)) * 100;

  return (
    <EuiStat
      title={
        <EuiText style={{ fontWeight: 'bold' }}>
          {value}
          <Label value={percentDelta} prepend="(" append=")" />
        </EuiText>
      }
      description={sampleHeader}
    />
  );
}
