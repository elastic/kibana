/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  getEnrichmentIdentifiers,
  buildThreatDetailsItems,
} from './threat_intelligence';

describe('parseExistingEnrichments', () => {
  it('returns an empty array if data is empty', () => {
    expect(parseExistingEnrichments([])).toEqual([]);
  });

  it('returns an empty array if data contains no enrichment field', () => {
    const data = [
      {
        category: 'host',
        field: 'host.os.name.text',
        isObjectArray: false,
        originalValue: ['Mac OS X'],
        values: ['Mac OS X'],
      },
    ];
    expect(parseExistingEnrichments(data)).toEqual([]);
  });

  it('returns an empty array if enrichment field contains invalid JSON', () => {
    const data = [
      {
        category: 'threat',
        field: 'threat.enrichments',
        isObjectArray: true,
        originalValue: ['whoops'],
        values: ['whoops'],
      },
    ];
    expect(parseExistingEnrichments(data)).toEqual([]);
  });

  it('returns an array if enrichment field contains valid JSON', () => {
    const data = [
      {
        category: 'threat',
        field: 'threat.enrichments',
        isObjectArray: true,
        originalValue: [
          '{"matched.field":["matched_field","other_matched_field"],"indicator.first_seen":["2021-02-22T17:29:25.195Z"],"indicator.provider":["yourself"],"indicator.type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"]},{"great.field":["grrrrr_2"]}]}',
        ],
        values: [
          '{"matched.field":["matched_field","other_matched_field"],"indicator.first_seen":["2021-02-22T17:29:25.195Z"],"indicator.provider":["yourself"],"indicator.type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"]},{"great.field":["grrrrr_2"]}]}',
        ],
      },
    ];

    expect(parseExistingEnrichments(data)).toEqual([
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['matched_field', 'other_matched_field'],
          values: ['matched_field', 'other_matched_field'],
        },
        {
          category: 'indicator',
          field: 'indicator.first_seen',
          isObjectArray: false,
          originalValue: ['2021-02-22T17:29:25.195Z'],
          values: ['2021-02-22T17:29:25.195Z'],
        },
        {
          category: 'indicator',
          field: 'indicator.provider',
          isObjectArray: false,
          originalValue: ['yourself'],
          values: ['yourself'],
        },
        {
          category: 'indicator',
          field: 'indicator.type',
          isObjectArray: false,
          originalValue: ['custom'],
          values: ['custom'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['matched_atomic'],
          values: ['matched_atomic'],
        },
        {
          category: 'lazer',
          field: 'lazer',
          isObjectArray: true,
          originalValue: ['{"great.field":["grrrrr"]}', '{"great.field":["grrrrr_2"]}'],
          values: ['{"great.field":["grrrrr"]}', '{"great.field":["grrrrr_2"]}'],
        },
      ],
    ]);
  });

  it('returns multiple arrays for multiple enrichments', () => {
    const data = [
      {
        category: 'threat',
        field: 'threat.enrichments',
        isObjectArray: true,
        originalValue: [
          '{"matched.field":["matched_field","other_matched_field"],"indicator.first_seen":["2021-02-22T17:29:25.195Z"],"indicator.provider":["yourself"],"indicator.type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"]},{"great.field":["grrrrr_2"]}]}',
          '{"matched.field":["matched_field_2"],"indicator.first_seen":["2021-02-22T17:29:25.195Z"],"indicator.provider":["other_you"],"indicator.type":["custom"],"matched.atomic":["matched_atomic_2"],"lazer":[{"great.field":[{"wowoe":[{"fooooo":["grrrrr"]}],"astring":"cool","aNumber":1,"neat":true}]}]}',
          '{"matched.field":["host.name"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["FFEtSYIBZ61VHL7LvV2j"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
          '{"matched.field":["host.hostname"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["E1EtSYIBZ61VHL7Ltl3m"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
          '{"matched.field":["host.architecture"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["E1EtSYIBZ61VHL7Ltl3m"],"matched.atomic":["x86_64"]}',
          '{"matched.field":["host.name"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["E1EtSYIBZ61VHL7Ltl3m"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
          '{"matched.field":["host.hostname"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["CFErSYIBZ61VHL7LIV1N"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
        ],
        values: [
          '{"matched.field":["matched_field","other_matched_field"],"indicator.first_seen":["2021-02-22T17:29:25.195Z"],"indicator.provider":["yourself"],"indicator.type":["custom"],"matched.atomic":["matched_atomic"],"lazer":[{"great.field":["grrrrr"]},{"great.field":["grrrrr_2"]}]}',
          '{"matched.field":["matched_field_2"],"indicator.first_seen":["2021-02-22T17:29:25.195Z"],"indicator.provider":["other_you"],"indicator.type":["custom"],"matched.atomic":["matched_atomic_2"],"lazer":[{"great.field":[{"wowoe":[{"fooooo":["grrrrr"]}],"astring":"cool","aNumber":1,"neat":true}]}]}',
          '{"matched.field":["host.name"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["FFEtSYIBZ61VHL7LvV2j"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
          '{"matched.field":["host.hostname"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["E1EtSYIBZ61VHL7Ltl3m"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
          '{"matched.field":["host.architecture"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["E1EtSYIBZ61VHL7Ltl3m"],"matched.atomic":["x86_64"]}',
          '{"matched.field":["host.name"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["E1EtSYIBZ61VHL7Ltl3m"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
          '{"matched.field":["host.hostname"],"matched.index":["im"],"matched.type":["indicator_match_rule"],"matched.id":["CFErSYIBZ61VHL7LIV1N"],"matched.atomic":["MacBook-Pro-de-Gloria.local"]}',
        ],
      },
    ];

    expect(parseExistingEnrichments(data)).toEqual([
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['matched_field', 'other_matched_field'],
          values: ['matched_field', 'other_matched_field'],
        },
        {
          category: 'indicator',
          field: 'indicator.first_seen',
          isObjectArray: false,
          originalValue: ['2021-02-22T17:29:25.195Z'],
          values: ['2021-02-22T17:29:25.195Z'],
        },
        {
          category: 'indicator',
          field: 'indicator.provider',
          isObjectArray: false,
          originalValue: ['yourself'],
          values: ['yourself'],
        },
        {
          category: 'indicator',
          field: 'indicator.type',
          isObjectArray: false,
          originalValue: ['custom'],
          values: ['custom'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['matched_atomic'],
          values: ['matched_atomic'],
        },
        {
          category: 'lazer',
          field: 'lazer',
          isObjectArray: true,
          originalValue: ['{"great.field":["grrrrr"]}', '{"great.field":["grrrrr_2"]}'],
          values: ['{"great.field":["grrrrr"]}', '{"great.field":["grrrrr_2"]}'],
        },
      ],
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['matched_field_2'],
          values: ['matched_field_2'],
        },
        {
          category: 'indicator',
          field: 'indicator.first_seen',
          isObjectArray: false,
          originalValue: ['2021-02-22T17:29:25.195Z'],
          values: ['2021-02-22T17:29:25.195Z'],
        },
        {
          category: 'indicator',
          field: 'indicator.provider',
          isObjectArray: false,
          originalValue: ['other_you'],
          values: ['other_you'],
        },
        {
          category: 'indicator',
          field: 'indicator.type',
          isObjectArray: false,
          originalValue: ['custom'],
          values: ['custom'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['matched_atomic_2'],
          values: ['matched_atomic_2'],
        },
        {
          category: 'lazer',
          field: 'lazer',
          isObjectArray: true,
          originalValue: [
            '{"great.field":[{"wowoe":[{"fooooo":["grrrrr"]}],"astring":"cool","aNumber":1,"neat":true}]}',
          ],
          values: [
            '{"great.field":[{"wowoe":[{"fooooo":["grrrrr"]}],"astring":"cool","aNumber":1,"neat":true}]}',
          ],
        },
      ],
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.name'],
          values: ['host.name'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['im'],
          values: ['im'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: ['indicator_match_rule'],
          values: ['indicator_match_rule'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['FFEtSYIBZ61VHL7LvV2j'],
          values: ['FFEtSYIBZ61VHL7LvV2j'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['MacBook-Pro-de-Gloria.local'],
          values: ['MacBook-Pro-de-Gloria.local'],
        },
      ],
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.hostname'],
          values: ['host.hostname'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['im'],
          values: ['im'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: ['indicator_match_rule'],
          values: ['indicator_match_rule'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['E1EtSYIBZ61VHL7Ltl3m'],
          values: ['E1EtSYIBZ61VHL7Ltl3m'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['MacBook-Pro-de-Gloria.local'],
          values: ['MacBook-Pro-de-Gloria.local'],
        },
      ],
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.architecture'],
          values: ['host.architecture'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['im'],
          values: ['im'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: ['indicator_match_rule'],
          values: ['indicator_match_rule'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['E1EtSYIBZ61VHL7Ltl3m'],
          values: ['E1EtSYIBZ61VHL7Ltl3m'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['x86_64'],
          values: ['x86_64'],
        },
      ],
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.name'],
          values: ['host.name'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['im'],
          values: ['im'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: ['indicator_match_rule'],
          values: ['indicator_match_rule'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['E1EtSYIBZ61VHL7Ltl3m'],
          values: ['E1EtSYIBZ61VHL7Ltl3m'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['MacBook-Pro-de-Gloria.local'],
          values: ['MacBook-Pro-de-Gloria.local'],
        },
      ],
      [
        {
          category: 'matched',
          field: 'matched.field',
          isObjectArray: false,
          originalValue: ['host.hostname'],
          values: ['host.hostname'],
        },
        {
          category: 'matched',
          field: 'matched.index',
          isObjectArray: false,
          originalValue: ['im'],
          values: ['im'],
        },
        {
          category: 'matched',
          field: 'matched.type',
          isObjectArray: false,
          originalValue: ['indicator_match_rule'],
          values: ['indicator_match_rule'],
        },
        {
          category: 'matched',
          field: 'matched.id',
          isObjectArray: false,
          originalValue: ['CFErSYIBZ61VHL7LIV1N'],
          values: ['CFErSYIBZ61VHL7LIV1N'],
        },
        {
          category: 'matched',
          field: 'matched.atomic',
          isObjectArray: false,
          originalValue: ['MacBook-Pro-de-Gloria.local'],
          values: ['MacBook-Pro-de-Gloria.local'],
        },
      ],
    ]);
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
  it('returns an empty object if items is empty', () => {
    expect(getEnrichmentFields([])).toEqual({});
  });

  it('returns an object of event fields and values', () => {
    const data = [
      {
        category: 'source',
        field: 'source.ip',
        isObjectArray: false,
        originalValue: ['192.168.1.1'],
        values: ['192.168.1.1'],
      },
      {
        category: 'event',
        field: 'event.reference',
        isObjectArray: false,
        originalValue: ['https://urlhaus.abuse.ch/url/1055419/'],
        values: ['https://urlhaus.abuse.ch/url/1055419/'],
      },
    ];
    expect(getEnrichmentFields(data)).toEqual({
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
          value: 'feed name',
        },
        title: 'feed.name',
      },
      {
        description: {
          fieldName: 'matched.atomic',
          value: 'matched atomic',
        },
        title: 'matched.atomic',
      },
      {
        description: {
          fieldName: 'matched.field',
          value: 'matched field',
        },
        title: 'matched.field',
      },
      {
        description: {
          fieldName: 'matched.type',
          value: 'matched type',
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
          value: 'first value',
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
          value: '127.0.0.1',
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
          value: 'bar',
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
              value:
                'This field contains nested object values, which are not rendered here. See the full document for all fields/values',
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
              value:
                'This field contains nested object values, which are not rendered here. See the full document for all fields/values',
            },
          },
        ]);
      });
    });
  });
});
