/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnnotationDomainType, LineAnnotation, RectAnnotation } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { COMPARATOR_MAPPING } from '../../../slo_edit/constants';

interface Props {
  slo: SLOWithSummaryResponse;
  maxValue?: number | null;
  minValue?: number | null;
}

export function MetricTimesliceAnnotation({ slo, maxValue, minValue }: Props) {
  const { euiTheme } = useEuiTheme();

  if (slo.indicator.type !== 'sli.metric.timeslice') {
    return null;
  }

  const threshold = slo.indicator.params.metric.threshold;
  return (
    <>
      <LineAnnotation
        id="thresholdAnnotation"
        domainType={AnnotationDomainType.YDomain}
        dataValues={[{ dataValue: threshold }]}
        style={{
          line: {
            strokeWidth: 2,
            stroke: euiTheme.colors.warning,
            opacity: 1,
          },
        }}
        marker={<span>{threshold}</span>}
        markerPosition="right"
      />
      <RectAnnotation
        dataValues={[
          {
            coordinates: ['GT', 'GTE'].includes(slo.indicator.params.metric.comparator)
              ? { y0: threshold, y1: maxValue }
              : { y0: minValue, y1: threshold },
            details: `${COMPARATOR_MAPPING[slo.indicator.params.metric.comparator]} ${threshold}`,
          },
        ]}
        id="thresholdShade"
        style={{ fill: euiTheme.colors.warning, opacity: 0.1 }}
      />
    </>
  );
}
