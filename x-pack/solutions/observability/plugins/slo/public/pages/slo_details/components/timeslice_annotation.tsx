/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { AnnotationDomainType, LineAnnotation, RectAnnotation } from '@elastic/charts';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { COMPARATOR_MAPPING } from '../../slo_edit/constants';

interface Props {
  slo: SLOWithSummaryResponse;
  maxValue?: number | null;
  minValue?: number | null;
  annotation?: React.ReactNode;
}

export function TimesliceAnnotation({ slo, maxValue, minValue }: Props) {
  const { euiTheme } = useEuiTheme();

  const threshold =
    slo.indicator.type === 'sli.metric.timeslice'
      ? slo.indicator.params.metric.threshold
      : undefined;

  return slo.indicator.type === 'sli.metric.timeslice' && threshold ? (
    <>
      <LineAnnotation
        id="thresholdAnnotation"
        domainType={AnnotationDomainType.YDomain}
        dataValues={[{ dataValue: threshold }]}
        style={{
          line: {
            strokeWidth: 2,
            stroke: euiTheme.colors.warning || '#000',
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
              ? {
                  y0: threshold,
                  y1: maxValue,
                }
              : { y0: minValue, y1: threshold },
            details: `${COMPARATOR_MAPPING[slo.indicator.params.metric.comparator]} ${threshold}`,
          },
        ]}
        id="thresholdShade"
        style={{ fill: euiTheme.colors.warning || '#000', opacity: 0.1 }}
      />
    </>
  ) : null;
}
