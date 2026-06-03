/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ENRICHMENT_DESTINATION_PATH } from '../../../../../../common/constants';
import { ENRICHMENT_TYPES } from '../../../../../../common/cti/constants';
import type { SignalSourceHit } from '../../types';

import { getThreatListItemMock } from './build_threat_mapping_filter.mock';
import {
  buildEnrichments,
  enrichSignalThreatMatchesFromSignalsMap,
} from './enrich_signal_threat_matches';
import { getNamedQueryMock, getSignalHitMock } from './enrich_signal_threat_matches.mock';
import type { MatchedHitAndQuery } from './get_signal_id_to_matched_queries_map';

describe('buildEnrichments', () => {
  let hitsAndQueries: MatchedHitAndQuery[];
  let indicatorPath: string;
  const threatMappings = [
    {
      entries: [
        {
          field: 'event.field',
          type: 'mapping' as const,
          value: 'threat.indicator.domain',
        },
      ],
    },
  ];

  beforeEach(() => {
    indicatorPath = 'threat.indicator';
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {
            event: { dataset: 'abuse.ch', reference: 'https://test.com' },
            threat: {
              indicator: {
                domain: 'domain_1',
                other: 'other_1',
                reference: 'https://test.com',
                type: 'type_1',
              },
            },
          },
        }),
        query: getNamedQueryMock(),
      },
    ];
  });

  it('returns an empty list if queries is empty', () => {
    const enrichments = buildEnrichments({
      hitsAndQueries: [],
      threatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([]);
  });

  it('returns the value of the matched indicator as undefined', () => {
    const [enrichment] = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.atomic')).toEqual(undefined);
  });

  it('does not enrich from other fields in the indicator document', () => {
    const [enrichment] = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });
    expect(Object.keys(enrichment)).toEqual(['indicator', 'feed', 'matched']);
  });

  it('returns the _id of the matched indicator as matched.id', () => {
    const [enrichment] = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.id')).toEqual('123');
  });

  it('returns the _index of the matched indicator as matched.index', () => {
    const [enrichment] = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.index')).toEqual('threat_index');
  });

  it('returns the field of the matched indicator as matched.field', () => {
    const [enrichment] = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.field')).toEqual('event.field');
  });

  it('returns the type of the enrichment as an indicator match type', () => {
    const [enrichment] = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(get(enrichment, 'matched.type')).toEqual(ENRICHMENT_TYPES.IndicatorMatchRule);
  });

  it('returns enrichments for each provided query', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {
            threat: {
              indicator: {
                domain: 'domain_1',
                other: 'other_1',
                reference: 'https://test.com',
                type: 'type_1',
              },
            },
          },
        }),
        query: getNamedQueryMock(),
      },
      {
        threatHit: getThreatListItemMock({
          _id: '456',
          _source: {
            threat: {
              indicator: {
                domain: 'domain_1',
                other: 'other_1',
                reference: 'https://test2.com',
                type: 'type_1',
              },
            },
          },
        }),
        query: getNamedQueryMock(),
      },
    ];
    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(enrichments).toHaveLength(2);
  });

  it('returns the indicator data specified at threat.indicator by default', () => {
    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          type: 'type_1',
          reference: 'https://test.com',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns the indicator data specified at the custom path', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {
            'threat.indicator.domain': 'domain_1',
            custom: {
              indicator: {
                path: {
                  indicator_field: 'indicator_field_1',
                  reference: 'https://test3.com',
                  type: 'indicator_type',
                },
              },
            },
          },
        }),
        query: getNamedQueryMock(),
      },
    ];

    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath: 'custom.indicator.path',
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          indicator_field: 'indicator_field_1',
          reference: 'https://test3.com',
          type: 'indicator_type',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('does not duplicate enrichments if there are duplicate threat mapping entries', () => {
    const localThreatMappings = [
      {
        entries: [
          {
            field: 'event.field',
            type: 'mapping' as const,
            value: 'threat.indicator.domain',
          },
          {
            field: 'event.field',
            type: 'mapping' as const,
            value: 'threat.indicator.domain',
          },
        ],
      },
    ];

    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings: localThreatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          reference: 'https://test.com',
          type: 'type_1',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('adds a second enrichment if threat mapping entries are not duplicates', () => {
    const localThreatMappings = [
      {
        entries: [
          {
            field: 'event.field',
            type: 'mapping' as const,
            value: 'threat.indicator.domain',
          },
          {
            field: 'event.other',
            type: 'mapping' as const,
            value: 'threat.indicator.other',
          },
        ],
      },
    ];

    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings: localThreatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          reference: 'https://test.com',
          type: 'type_1',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          reference: 'https://test.com',
          type: 'type_1',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.other',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns only the match data if indicator field is absent', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {},
        }),
        query: getNamedQueryMock(),
      },
    ];

    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {},
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns only the match data if indicator field is an empty array', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: { threat: { indicator: [] } },
        }),
        query: getNamedQueryMock(),
      },
    ];

    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {},
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('returns data sans atomic from first indicator if indicator field is an array of objects', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {
            threat: {
              indicator: [
                { domain: 'foo', reference: 'https://test4.com', type: 'first' },
                { domain: 'bar', reference: 'https://test5.com', type: 'second' },
              ],
            },
          },
        }),
        query: getNamedQueryMock(),
      },
    ];

    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'foo',
          reference: 'https://test4.com',
          type: 'first',
        },
        matched: {
          atomic: undefined,
          id: '123',
          index: 'threat_index',
          field: 'event.field',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('throws an error if indicator field is a not an object', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {
            threat: {
              indicator: 'not an object',
            },
          },
        }),
        query: getNamedQueryMock(),
      },
    ];

    expect(() =>
      buildEnrichments({
        hitsAndQueries,
        threatMappings,
        indicatorPath,
      })
    ).toThrowError('Expected indicator field to be an object, but found: not an object');
  });

  it('throws an error if indicator field is not an array of objects', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {
            threat: {
              indicator: ['not an object'],
            },
          },
        }),
        query: getNamedQueryMock(),
      },
    ];

    expect(() =>
      buildEnrichments({
        hitsAndQueries,
        threatMappings,
        indicatorPath,
      })
    ).toThrowError('Expected indicator field to be an object, but found: not an object');
  });

  it('returns the feed data if it specified', () => {
    hitsAndQueries = [
      {
        threatHit: getThreatListItemMock({
          _id: '123',
          _source: {
            event: { dataset: 'abuse.ch', reference: 'https://test.com' },
            threat: {
              feed: { name: 'feed name' },
              indicator: {
                domain: 'domain_1',
                other: 'other_1',
                reference: 'https://test.com',
                type: 'type_1',
              },
            },
          },
        }),
        query: getNamedQueryMock(),
      },
    ];

    const enrichments = buildEnrichments({
      hitsAndQueries,
      threatMappings,
      indicatorPath,
    });

    expect(enrichments).toEqual([
      {
        feed: {
          name: 'feed name',
        },
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          reference: 'https://test.com',
          type: 'type_1',
        },
        matched: {
          atomic: undefined,
          field: 'event.field',
          id: '123',
          index: 'threat_index',
          type: 'indicator_match_rule',
        },
      },
    ]);
  });
});

describe('enrichSignalThreatMatchesFromSignalsMap', () => {
  let indicatorPath: string;
  let signalsMap = new Map();
  const threatMappings = [
    {
      entries: [
        {
          field: 'event.domain',
          type: 'mapping' as const,
          value: 'threat.indicator.domain',
        },
      ],
    },
  ];

  beforeEach(() => {
    indicatorPath = 'threat.indicator';
    signalsMap = new Map<string, MatchedHitAndQuery[]>([
      [
        'source-id',
        [
          {
            threatHit: getThreatListItemMock({
              _id: '123',
              _source: {
                event: {
                  category: 'malware',
                },
                threat: { indicator: { domain: 'domain_1', other: 'other_1', type: 'type_1' } },
              },
            }),
            query: {
              threatMappingIndex: 0,
              queryType: 'mq',
            },
          },
        ],
      ],
    ]);
  });

  it('performs no enrichment if there are no signals', async () => {
    const signals: SignalSourceHit[] = [];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      indicatorPath,
      new Map(),
      threatMappings
    );

    expect(enrichedSignals).toEqual([]);
  });

  it('performs no enrichment if signalsMap empty', async () => {
    const signalHit = getSignalHitMock({
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'malware', domain: 'domain_1' },
        threat: { enrichments: [{ existing: 'indicator' }] },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      indicatorPath,
      new Map(),
      threatMappings
    );

    expect(enrichedSignals).toEqual([signalHit]);
  });

  it('preserves existing threat.enrichments objects on signals', async () => {
    const signalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'malware', domain: 'domain_1' },
        threat: { enrichments: [{ existing: 'indicator' }] },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      indicatorPath,
      signalsMap,
      threatMappings
    );
    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      { existing: 'indicator' },
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          type: 'type_1',
        },
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'threat_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('preserves an existing threat.enrichments object on signals', async () => {
    const signalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        '@timestamp': 'mocked',
        event: { category: 'virus', domain: 'domain_1' },
        threat: {
          enrichments: [
            { indicator: { existing: 'indicator' } },
            { indicator: { existing: 'indicator2' } },
          ],
        },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      indicatorPath,
      signalsMap,
      threatMappings
    );
    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      {
        indicator: { existing: 'indicator' },
      },
      {
        indicator: { existing: 'indicator2' },
      },
      {
        feed: {},
        indicator: {
          domain: 'domain_1',
          other: 'other_1',
          type: 'type_1',
        },
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'threat_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });

  it('throws an error if threat is neither an object nor undefined', async () => {
    const signalHit = getSignalHitMock({
      _source: { '@timestamp': 'mocked', threat: 'whoops' },
    });
    const signals: SignalSourceHit[] = [signalHit];
    await expect(() =>
      enrichSignalThreatMatchesFromSignalsMap(signals, indicatorPath, signalsMap, threatMappings)
    ).rejects.toThrowError('Expected threat field to be an object, but found: whoops');
  });

  it('enriches from a configured indicator path, if specified', async () => {
    signalsMap = new Map<string, MatchedHitAndQuery[]>([
      [
        'source-id',
        [
          {
            threatHit: getThreatListItemMock({
              _id: '123',
              _source: {
                custom_threat: {
                  custom_indicator: {
                    domain: 'custom_domain',
                    other: 'custom_other',
                    type: 'custom_type',
                  },
                },
              },
            }),
            query: {
              threatMappingIndex: 0,
              queryType: 'mq',
            },
          },
        ],
      ],
    ]);
    const signalHit = getSignalHitMock({
      _id: 'source-id',
      _source: {
        event: {
          domain: 'domain_1',
        },
      },
    });
    const signals: SignalSourceHit[] = [signalHit];
    const enrichedSignals = await enrichSignalThreatMatchesFromSignalsMap(
      signals,
      'custom_threat.custom_indicator',
      signalsMap,
      threatMappings
    );
    const [enrichedHit] = enrichedSignals;
    const enrichments = get(enrichedHit._source, ENRICHMENT_DESTINATION_PATH);

    expect(enrichments).toEqual([
      {
        feed: {},
        indicator: {
          domain: 'custom_domain',
          other: 'custom_other',
          type: 'custom_type',
        },
        matched: {
          atomic: 'domain_1',
          id: '123',
          index: 'threat_index',
          field: 'event.domain',
          type: ENRICHMENT_TYPES.IndicatorMatchRule,
        },
      },
    ]);
  });
});
