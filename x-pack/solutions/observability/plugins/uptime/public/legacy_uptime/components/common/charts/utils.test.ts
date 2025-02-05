/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDateRangeFromChartElement } from './utils';
import { XYChartElementEvent } from '@elastic/charts';

describe('Chart utils', () => {
  it('get date range from chart element should add 100 miliseconds', () => {
    const elementData = [{ x: 1548697920000, y: 4 }];
    const dr = getDateRangeFromChartElement(elementData as XYChartElementEvent, 1000);
    expect(dr).toStrictEqual({
      dateRangeStart: '2019-01-28T17:52:00.000Z',
      dateRangeEnd: '2019-01-28T17:52:01.000Z',
    });
  });
});
