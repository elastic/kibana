/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ColorPalette } from './color_palette';
import { useObjectMetrics } from '../hooks/use_object_metrics';

export const ObjectWeightList = () => {
  const objectMetrics = useObjectMetrics();
  const hasAnyThresholdBreach = objectMetrics.items.some(
    ({ weightDelta }) => Math.abs(Number(weightDelta)) > 5
  );
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>{OBJECT_WEIGHT_LABEL}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {TOTAL_SIZE_LABEL}:{' '}
            <span style={{ fontWeight: 'bold' }}>{objectMetrics.totalObjectsWeight}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div>
        {objectMetrics.items.map(({ label, mimeType, weightPercent, weight, weightDelta }) => (
          <Fragment key={mimeType}>
            <ColorPalette
              hasAnyThresholdBreach={hasAnyThresholdBreach}
              label={label}
              mimeType={mimeType}
              percent={weightPercent}
              value={weight}
              loading={objectMetrics.loading}
              delta={Number(weightDelta)}
            />
            <EuiSpacer size="m" />{' '}
          </Fragment>
        ))}
      </div>
    </>
  );
};

const OBJECT_WEIGHT_LABEL = i18n.translate('xpack.synthetics.stepDetails.objectWeight', {
  defaultMessage: 'Object weight',
});

const TOTAL_SIZE_LABEL = i18n.translate('xpack.synthetics.stepDetails.totalSize', {
  defaultMessage: 'Total size',
});
