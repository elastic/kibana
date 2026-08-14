/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '@kbn/maps-plugin/common';
import { countryChoroplethLayer, isoFromMapProperties } from './country_map_layer';

describe('isoFromMapProperties', () => {
  it('reads EMS iso2 and normalizes case', () => {
    expect(isoFromMapProperties({ iso2: 'de' })).toBe('DE');
    expect(isoFromMapProperties({ isoCode: 'IN' })).toBe('IN');
    expect(isoFromMapProperties({})).toBeUndefined();
  });
});

describe('countryChoroplethLayer', () => {
  it('joins the country rollup to world_countries on iso2', () => {
    const layer = countryChoroplethLayer(
      [
        {
          isoCode: 'de',
          name: 'Germany',
          pageViews: 21,
          sessions: 6,
          errorCount: 1,
          p75Lcp: 43,
        },
      ],
      'pageViews'
    );
    expect(layer).toMatchObject({
      sourceDescriptor: {
        type: SOURCE_TYPES.EMS_FILE,
        id: 'world_countries',
      },
      joins: [
        {
          leftField: 'iso2',
          right: {
            type: SOURCE_TYPES.TABLE_SOURCE,
            term: 'isoCode',
            __rows: [{ isoCode: 'DE', pageViews: 21, sessions: 6, errorCount: 1 }],
          },
        },
      ],
    });
  });
});
