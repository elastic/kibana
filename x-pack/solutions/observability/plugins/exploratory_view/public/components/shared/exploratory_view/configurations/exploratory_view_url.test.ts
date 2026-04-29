/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createExploratoryViewUrl } from './exploratory_view_url';
import type { AllSeries } from '../../../..';

describe('createExploratoryViewUrl', () => {
  const testAllSeries = [
    {
      dataType: 'synthetics',
      seriesType: 'area',
      selectedMetricField: 'monitor.duration.us',
      time: {
        from: 'now-15m',
        to: 'now',
      },
      breakdown: 'monitor.type',
      reportDefinitions: {
        'monitor.name': [],
        'url.full': ['ALL_VALUES'],
      },
      name: 'All monitors response duration',
    },
  ] as AllSeries;

  describe('handles URL reserved chars', () => {
    const urlReservedRegex = /[;,\/?:@&=+$#]/;

    it('encodes &', () => {
      const seriesWithAmpersand = [{ ...testAllSeries[0], name: 'Name with &' }];
      const url = createExploratoryViewUrl({
        reportType: 'kpi-over-time',
        allSeries: seriesWithAmpersand,
      });

      expect(urlReservedRegex.test(grabRisonQueryFromUrl(url))).toEqual(false);
    });

    it('encodes other reserved chars', () => {
      const seriesWithAmpersand = [
        {
          ...testAllSeries[0],
          name: 'Name with URL reserved chars ;,/?:@&=+$#',
        },
      ];
      const url = createExploratoryViewUrl({
        reportType: 'kpi-over-time',
        allSeries: seriesWithAmpersand,
      });

      expect(urlReservedRegex.test(grabRisonQueryFromUrl(url))).toEqual(false);
    });
  });
});

function grabRisonQueryFromUrl(url: string) {
  return url.split('sr=')[1];
}
