/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { formatLocationAsGeoEcs, transformLocationFields } from './format_response_object_values';

describe('formatLocationAsGeoEcs', () => {
  it('returns GeoEcs location if item has both coordinates', () => {
    const res = formatLocationAsGeoEcs([
      {
        coordinates: [-77.2481, 38.6583],
        type: 'Point',
      },
    ]);
    expect(res).toEqual({ lon: [-77.2481], lat: [38.6583] });
  });

  it('returns input item without geo formatting if it does not have both coordinates', () => {
    const input = [
      {
        coordinates: [-77.2481],
        type: 'Point',
      },
    ];
    const res = formatLocationAsGeoEcs(input);
    expect(res).toEqual(input);
  });

  it('returns input item without geo formatting if the coordinates property is missing', () => {
    const res = formatLocationAsGeoEcs(['test']);
    expect(res).toEqual(['test']);

    const resEmpty = formatLocationAsGeoEcs([]);
    expect(resEmpty).toEqual([]);
  });
});

describe('transformLocationFields', () => {
  it('returns transformed location if it has a valid format and both coordinates', () => {
    const res = transformLocationFields({
      'source.geo.region_name': ['Virginia'],
      'source.geo.location': [
        {
          coordinates: [-77.2481, 38.6583],
          type: 'Point',
        },
      ],
    });
    expect(res).toEqual({
      'source.geo.region_name': ['Virginia'],
      'source.geo.location': { lon: [-77.2481], lat: [38.6583] },
    });
  });

  it('returns input item without geo transformation, if it does not have both coordinates', () => {
    const input = {
      someOtherFeild: ['test'],
      'some.geo.location': [
        {
          coordinates: [-77.2481],
          type: 'Point',
        },
      ],
    };
    const res = transformLocationFields(input);
    expect(res).toEqual(input);
  });

  it('returns input item without geo transformation, if location is not a geo location', () => {
    const input = {
      someOtherFeild: ['test'],
      'some.location': [
        {
          coordinates: [-77.2481, 67],
          type: 'Point',
        },
      ],
    };
    const res = transformLocationFields(input);
    expect(res).toEqual(input);
  });

  it('returns input item without geo formatting if the coordinates property is missing', () => {
    const res = transformLocationFields({});
    expect(res).toEqual({});

    const resEmpty = transformLocationFields({
      someOtherFeild: ['test'],
    });
    expect(resEmpty).toEqual({
      someOtherFeild: ['test'],
    });
  });
});
