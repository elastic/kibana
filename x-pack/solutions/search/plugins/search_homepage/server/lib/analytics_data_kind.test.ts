/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { DATA_KIND_FIXTURES } from '../../common/__fixtures__/analytics_data_kind_sources';
import {
  EVENT_SOURCE_FIXTURES,
  toFieldCaps,
} from '../../common/__fixtures__/analytics_event_sources';
import type { AnalyticsDataKind, AnalyticsEventSource } from '../../common/analytics';
import { pickTimeField } from './analytics_cluster_state';
import {
  classifyDataKind,
  deriveJourney,
  matchDataKindRule,
  readSearchEvidence,
} from './analytics_data_kind';
import { SAMPLE_EVENTS_MAPPINGS } from './analytics_sample_events_generator';
import { detectSourceFields } from './analytics_source_fields';

const classify = (
  properties: Record<string, MappingProperty>,
  kind: AnalyticsEventSource['kind'] = 'index'
): { rule: string; dataKind: AnalyticsDataKind; timeField: string | null } => {
  const fieldCaps = toFieldCaps(properties);
  const timeField = pickTimeField(fieldCaps, kind === 'dataStream' ? '@timestamp' : undefined);
  const evidence = {
    kind,
    timeField,
    roles: detectSourceFields(fieldCaps),
    ...readSearchEvidence(fieldCaps),
  };

  return {
    rule: matchDataKindRule(evidence).id,
    dataKind: classifyDataKind(evidence),
    timeField,
  };
};

const source = (
  dataKind: AnalyticsDataKind,
  isSampleData = false
): Pick<AnalyticsEventSource, 'dataKind' | 'isSampleData'> => ({ dataKind, isSampleData });

describe('classifyDataKind', () => {
  it.each(DATA_KIND_FIXTURES.map((fixture) => [fixture.id, fixture.dataKind, fixture]))(
    'classifies %s as %s',
    (_id, _dataKind, { properties, kind, timeField, dataKind, rule }) => {
      expect(classify(properties, kind)).toEqual({ rule, dataKind, timeField });
    }
  );

  it.each(
    EVENT_SOURCE_FIXTURES.map((fixture) => [fixture.id, fixture.dataKind ?? 'events', fixture])
  )('classifies the %s event source fixture as %s', (_id, dataKind, { properties }) => {
    expect(classify(properties).dataKind).toBe(dataKind);
  });

  it('classifies the generated clickstream sample as events', () => {
    expect(classify(SAMPLE_EVENTS_MAPPINGS.properties ?? {})).toEqual({
      rule: 'eventRoles',
      dataKind: 'events',
      timeField: '@timestamp',
    });
  });

  it('takes a field that runs inference in only some indices for semantic text', () => {
    expect(
      readSearchEvidence({
        body: {
          text: {
            type: 'text',
            searchable: true,
            aggregatable: false,
            inference: false,
            non_inference_indices: ['docs-000001'],
          },
        },
      })
    ).toEqual({ hasSearchIntentField: true, hasContentText: true });
  });

  it('does not take a log message or a keyword title for content', () => {
    expect(
      readSearchEvidence(
        toFieldCaps({
          message: { type: 'text' },
          error: { properties: { stack_trace: { type: 'match_only_text' } } },
          title: { type: 'keyword' },
        })
      )
    ).toEqual({ hasSearchIntentField: false, hasContentText: false });
  });

  it('keeps ECS event times apart from bookkeeping dates', () => {
    expect(
      classify({ event: { properties: { created: { type: 'date' } } }, title: { type: 'text' } })
    ).toEqual({ rule: 'eventTime', dataKind: 'events', timeField: 'event.created' });
  });

  it('does not take an owner without anything to add up for an event', () => {
    expect(
      classify({
        title: { type: 'text' },
        user_id: { type: 'keyword' },
        created_at: { type: 'date' },
      }).dataKind
    ).toBe('search');
    expect(
      classify({
        description: { type: 'text' },
        customer_id: { type: 'keyword' },
        amount: { type: 'double' },
        created_at: { type: 'date' },
      }).dataKind
    ).toBe('events');
  });
});

describe('deriveJourney', () => {
  it('is null without sources', () => {
    expect(deriveJourney([])).toBeNull();
  });

  it.each([
    ['analytics', [source('events'), source('events')]],
    ['search', [source('search')]],
    ['mixed', [source('search'), source('events')]],
  ] as const)('is %s', (journey, sources) => {
    expect(deriveJourney(sources)).toBe(journey);
  });

  it('follows sample data when there is nothing else', () => {
    expect(deriveJourney([source('events', true)])).toBe('analytics');
    expect(deriveJourney([source('search', true)])).toBe('search');
    expect(deriveJourney([source('events', true), source('search', true)])).toBe('mixed');
  });

  it('leaves sample data out next to real data', () => {
    expect(deriveJourney([source('events', true), source('search')])).toBe('search');
    expect(deriveJourney([source('search', true), source('events')])).toBe('analytics');
    expect(deriveJourney([source('events', true), source('search'), source('events')])).toBe(
      'mixed'
    );
  });
});
