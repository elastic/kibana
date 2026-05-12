/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildThreatDetailsItems, getEnrichmentIdentifiers } from './threat_intelligence';

describe('getEnrichmentIdentifiers', () => {
  it(`return feed name as feedName if it's present in enrichment`, () => {
    expect(
      getEnrichmentIdentifiers({
        'matched.id': [1],
        'matched.field': ['matched field'],
        'matched.atomic': ['matched atomic'],
        'matched.type': ['matched type'],
        'feed.name': ['feed name'],
      })
    ).toEqual({
      id: 1,
      field: 'matched field',
      value: 'matched atomic',
      type: 'matched type',
      feedName: 'feed name',
    });
  });
});

describe('buildThreatDetailsItems', () => {
  it('returns an empty array if given an empty enrichment', () => {
    expect(buildThreatDetailsItems({})).toEqual([]);
  });

  it('returns an array of threat details items', () => {
    const enrichment = {
      'matched.field': ['matched field'],
      'matched.atomic': ['matched atomic'],
      'matched.type': ['matched type'],
      'feed.name': ['feed name'],
    };
    expect(buildThreatDetailsItems(enrichment)).toEqual([
      {
        description: {
          fieldName: 'feed.name',
          value: ['feed name'],
        },
        title: 'feed.name',
      },
      {
        description: {
          fieldName: 'matched.atomic',
          value: ['matched atomic'],
        },
        title: 'matched.atomic',
      },
      {
        description: {
          fieldName: 'matched.field',
          value: ['matched field'],
        },
        title: 'matched.field',
      },
      {
        description: {
          fieldName: 'matched.type',
          value: ['matched type'],
        },
        title: 'matched.type',
      },
    ]);
  });

  it('retrieves the first value of an array field', () => {
    const enrichment = {
      array_values: ['first value', 'second value'],
    };

    expect(buildThreatDetailsItems(enrichment)).toEqual([
      {
        title: 'array_values',
        description: {
          fieldName: 'array_values',
          value: ['first value', 'second value'],
        },
      },
    ]);
  });

  it('shortens indicator field names if they contain the default indicator path', () => {
    const enrichment = {
      'threat.indicator.ip': ['127.0.0.1'],
    };
    expect(buildThreatDetailsItems(enrichment)).toEqual([
      {
        title: 'indicator.ip',
        description: {
          fieldName: 'threat.indicator.ip',
          value: ['127.0.0.1'],
        },
      },
    ]);
  });

  it('parses an object field', () => {
    const enrichment = {
      'object_field.foo': ['bar'],
    };

    expect(buildThreatDetailsItems(enrichment)).toEqual([
      {
        title: 'object_field.foo',
        description: {
          fieldName: 'object_field.foo',
          value: ['bar'],
        },
      },
    ]);
  });

  it('converts numeric field values to strings', () => {
    const enrichment = {
      'indicator.file.size': [80280],
    };

    expect(buildThreatDetailsItems(enrichment)).toEqual([
      {
        title: 'indicator.file.size',
        description: {
          fieldName: 'indicator.file.size',
          value: ['80280'],
        },
      },
    ]);
  });

  describe('edge cases', () => {
    describe('field responses for fields of type "flattened"', () => {
      it('returns a note for the value of a flattened field containing a single object', () => {
        const enrichment = {
          flattened_object: [{ foo: 'bar' }],
        };

        expect(buildThreatDetailsItems(enrichment)).toEqual([
          {
            title: 'flattened_object',
            description: {
              fieldName: 'flattened_object',
              value: [
                'This field contains nested object values, which are not rendered here. See the full document for all fields/values',
              ],
            },
          },
        ]);
      });

      it('returns a note for the value of a flattened field containing an array of objects', () => {
        const enrichment = {
          array_field: [{ foo: 'bar' }, { baz: 'qux' }],
        };

        expect(buildThreatDetailsItems(enrichment)).toEqual([
          {
            title: 'array_field',
            description: {
              fieldName: 'array_field',
              value: [
                'This field contains nested object values, which are not rendered here. See the full document for all fields/values',
              ],
            },
          },
        ]);
      });
    });
  });
});
