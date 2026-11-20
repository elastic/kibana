/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  EVENT_SOURCE_FIXTURES,
  toFieldCaps,
} from '../../common/__fixtures__/analytics_event_sources';
import { pickTimeField } from './analytics_cluster_state';
import { detectSourceFields } from './analytics_source_fields';

type Fields = FieldCapsResponse['fields'];

const field = (type: string, overrides: Record<string, boolean | string> = {}): Fields[string] => ({
  [type]: { type, metadata_field: false, searchable: true, aggregatable: true, ...overrides },
});

describe('detectSourceFields', () => {
  it.each(EVENT_SOURCE_FIXTURES)('reads the $id mapping', ({ properties, fields, timeField }) => {
    const fieldCaps = toFieldCaps(properties);

    expect(detectSourceFields(fieldCaps)).toEqual(fields);
    expect(pickTimeField(fieldCaps)).toBe(timeField);
  });

  it('stays within the caps on candidates', () => {
    for (const { fields } of EVENT_SOURCE_FIXTURES) {
      expect(fields?.actors.length ?? 0).toBeLessThanOrEqual(2);
      expect(fields?.measures.length ?? 0).toBeLessThanOrEqual(3);
      expect(fields?.dimensions.length ?? 0).toBeLessThanOrEqual(4);
    }
  });

  it('gives a field one part at most', () => {
    for (const { fields } of EVENT_SOURCE_FIXTURES) {
      const names = fields
        ? [
            fields.action?.name,
            fields.session?.name,
            ...fields.actors.map(({ name }) => name),
            ...fields.measures.map(({ name }) => name),
            ...fields.dimensions.map(({ name }) => name),
          ].filter((name) => name !== undefined)
        : [];

      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('queries the keyword sub-field of a text field and never the text field', () => {
    expect(
      detectSourceFields({
        event_type: field('text', { aggregatable: false }),
        'event_type.keyword': field('keyword'),
        status: field('text', { aggregatable: false }),
      })
    ).toEqual({
      action: { name: 'event_type.keyword', label: 'event type' },
      actors: [],
      measures: [],
      dimensions: [],
    });
  });

  it('does not take a sub-field of an object for the object', () => {
    expect(detectSourceFields({ 'status.keyword': field('keyword') })).toBeUndefined();
  });

  it('leaves out fields ES|QL could not group or add up', () => {
    expect(
      detectSourceFields({
        // Mapped differently across the indices of the source.
        user_id: { ...field('keyword'), ...field('long') },
        amount: field('long', { time_series_metric: 'counter' }),
        status: field('keyword', { aggregatable: false }),
        country: field('ip'),
        revenue: field('unsigned_long'),
        _index: field('keyword', { metadata_field: true }),
      })
    ).toBeUndefined();
  });

  it('takes identifiers stored as numbers, but no measure from a keyword', () => {
    expect(
      detectSourceFields({
        user_id: field('long'),
        session_id: field('integer'),
        amount: field('keyword'),
        country: field('long'),
      })
    ).toEqual({
      actors: [{ name: 'user_id', label: 'user', kind: 'user' }],
      session: { name: 'session_id', label: 'session' },
      measures: [],
      dimensions: [],
    });
  });

  it('reads camelCase names and names inside wrapper objects', () => {
    expect(
      detectSourceFields({
        eventName: field('keyword'),
        'properties.userId': field('keyword'),
        'context.traits.planTier': field('keyword'),
        'data.orderTotal': field('double'),
      })
    ).toEqual({
      action: { name: 'eventName', label: 'event' },
      actors: [{ name: 'properties.userId', label: 'user', kind: 'user' }],
      measures: [{ name: 'data.orderTotal', label: 'order total', kind: 'money' }],
      dimensions: [{ name: 'context.traits.planTier', label: 'tier', kind: 'segment' }],
    });
  });

  it('trusts a common word only as the whole name', () => {
    expect(
      detectSourceFields({
        'product.name': field('keyword'),
        'file.type': field('keyword'),
        bytes_total: field('long'),
        'cloud.provider': field('keyword'),
      })
    ).toEqual({
      actors: [],
      measures: [],
      dimensions: [{ name: 'product.name', label: 'product', kind: 'product' }],
    });
  });

  it('prefers the more telling name and the shallower field', () => {
    const fields = detectSourceFields({
      type: field('keyword'),
      'event.action': field('keyword'),
      'client.user.id': field('keyword'),
      'user.id': field('keyword'),
      price: field('double'),
      'order.total': field('double'),
    });

    expect(fields?.action?.name).toBe('event.action');
    expect(fields?.actors.map(({ name }) => name)).toEqual(['user.id', 'client.user.id']);
    expect(fields?.measures.map(({ name }) => name)).toEqual(['order.total', 'price']);
  });

  it('offers one candidate of each kind before a second of the same kind', () => {
    const fields = detectSourceFields({
      user_id: field('keyword'),
      anonymous_id: field('keyword'),
      device_id: field('keyword'),
      country: field('keyword'),
      city: field('keyword'),
      region: field('keyword'),
      platform: field('keyword'),
      plan: field('keyword'),
      status: field('keyword'),
    });

    expect(fields?.actors).toEqual([
      { name: 'user_id', label: 'user', kind: 'user' },
      { name: 'device_id', label: 'device', kind: 'device' },
    ]);
    expect(fields?.dimensions.map(({ name }) => name)).toEqual([
      'status',
      'country',
      'platform',
      'plan',
    ]);
  });

  it('reports the shallowest geo point', () => {
    expect(
      detectSourceFields({
        'client.geo.location': field('geo_point'),
        'geo.location': field('geo_point'),
      })
    ).toEqual({ actors: [], measures: [], dimensions: [], geoPoint: 'geo.location' });
  });
});
