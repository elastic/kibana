/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import numeral from '@elastic/numeral';

export function normalizeDataTypeDifferences(metrics: any, fixture: any) {
  return Object.keys(metrics).reduce((accum: any, metricName) => {
    accum[metricName] = metrics[metricName].map((item: { data: number[][] }, index: number) => {
      return {
        ...item,
        data: item.data.map(([_x, y], index2) => {
          const expectedY = fixture.metrics[metricName][index].data[index2][1];
          if (y !== expectedY) {
            const normalizedY = numeral(y).format('0[.]00000');
            const normalizedExpectedY = numeral(y).format('0[.]00000');
            if (normalizedY === normalizedExpectedY) {
              return [_x, expectedY];
            }
          }
          return [_x, y];
        }),
      };
    });
    return accum;
  }, {});
}
