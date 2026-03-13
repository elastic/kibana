/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';
import type { DataTableRecord } from '@kbn/discover-utils';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';
import {
  buildThreatDetailsItems,
  filterDuplicateEnrichments,
  getEnrichmentFields,
  getEnrichmentIdentifiers,
  parseExistingEnrichments,
} from './threat_intelligence';

const createMockHit = (flattened: DataTableRecord['flattened'] = {}): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('parseExistingEnrichments', () => {
  it('returns an empty array if hit has no fields', () => {
    expect(parseExistingEnrichments(createMockHit())).toEqual([]);
  });

  it('returns an empty array if hit contains no enrichment field', () => {
    const hit = createMockHit({
      'host.os.name.text': ['Mac OS X'],
    });

    expect(parseExistingEnrichments(hit)).toEqual([]);
  });

  it('returns an empty array if enrichment field contains invalid JSON', () => {
    const hit = createMockHit({
      'threat.enrichments': ['whoops'],
    });

    expect(parseExistingEnrichments(hit)).toEqual([]);
  });

  it('returns an array of enrichments when threat.enrichments contains valid JSON strings', () => {
    const hit = createMockHit({
      'threat.enrichments': [
        '{"matched.field":["matched_field","other_matched_field"],"indicator.first_seen":["2021-02-22T17:29:25.195Z"],"indicator.provider":["yourself"],"indicator.type":["custom"],"matched.atomic":["matched_atomic"]}',
      ],
    });

    expect(parseExistingEnrichments(hit)).toEqual([
      {
        'matched.field': ['matched_field', 'other_matched_field'],
        'indicator.first_seen': ['2021-02-22T17:29:25.195Z'],
        'indicator.provider': ['yourself'],
        'indicator.type': ['custom'],
        'matched.atomic': ['matched_atomic'],
      },
    ]);
  });

  it('returns multiple enrichments for multiple values', () => {
    const hit = createMockHit({
      'threat.enrichments': [
        '{"matched.field":["host.name"],"matched.id":["1"],"matched.type":["indicator_match_rule"],"matched.atomic":["host-1"]}',
        '{"matched.field":["host.hostname"],"matched.id":["2"],"matched.type":["indicator_match_rule"],"matched.atomic":["host-2"]}',
      ],
    });

    const enrichments = parseExistingEnrichments(hit);
    expect(enrichments).toHaveLength(2);
    expect(enrichments[0]).toEqual({
      'matched.field': ['host.name'],
      'matched.id': ['1'],
      'matched.type': ['indicator_match_rule'],
      'matched.atomic': ['host-1'],
    });
    expect(enrichments[1]).toEqual({
      'matched.field': ['host.hostname'],
      'matched.id': ['2'],
      'matched.type': ['indicator_match_rule'],
      'matched.atomic': ['host-2'],
    });
  });
});

describe('filterDuplicateEnrichments', () => {
  it('returns an empty array if given one', () => {
    expect(filterDuplicateEnrichments([])).toEqual([]);
  });

  it('returns the existing enrichment if given both that and an investigation-time enrichment for the same indicator and field', () => {
    const existingEnrichment = buildEventEnrichmentMock({
      'matched.type': [ENRICHMENT_TYPES.IndicatorMatchRule],
    });
    const investigationEnrichment = buildEventEnrichmentMock({
      'matched.type': [ENRICHMENT_TYPES.InvestigationTime],
    });
    expect(filterDuplicateEnrichments([existingEnrichment, investigationEnrichment])).toEqual([
      existingEnrichment,
    ]);
  });

  it('includes two enrichments from the same indicator if it matched different fields', () => {
    const enrichments = [
      buildEventEnrichmentMock(),
      buildEventEnrichmentMock({
        'matched.field': ['other.field'],
      }),
    ];
    expect(filterDuplicateEnrichments(enrichments)).toEqual(enrichments);
  });
});

describe('getEnrichmentFields', () => {
  it('returns an empty object if hit is empty', () => {
    expect(getEnrichmentFields(createMockHit())).toEqual({});
  });

  it('returns an object of event fields and values', () => {
    const hit = createMockHit({
      'source.ip': ['192.168.1.1'],
      'event.reference': ['https://urlhaus.abuse.ch/url/1055419/'],
    });
    expect(getEnrichmentFields(hit)).toEqual({
      'source.ip': '192.168.1.1',
    });
  });
});

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
