/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, SignificantEvent } from '@kbn/significant-events-schema';
import { getImpactedServiceStreamNames, getImpactedServices } from './impacted_services';

const mockEvent = (overrides: Partial<SignificantEvent> = {}): SignificantEvent => ({
  '@timestamp': '2026-07-10T12:00:00Z',
  event_id: 'evt-001',
  event_uuid: 'evt-uuid-001',
  status: 'open',
  stream_names: ['logs.web-frontend'],
  title: 'Test event',
  summary: 'Summary',
  severity: '60-high',
  confidence: 0.9,
  ...overrides,
});

const mockFeature = (overrides: Partial<Feature> = {}): Feature => ({
  uuid: 'feat-checkout',
  id: 'checkout-api',
  stream_name: 'logs.checkout',
  type: 'entity',
  subtype: 'service',
  title: 'Checkout API',
  description: 'Checkout service entity',
  properties: { 'service.name': 'checkout-api' },
  confidence: 82,
  ...overrides,
});

const entityEntry = {
  type: 'entity' as const,
  feature_id: 'feat-checkout',
  name: 'checkout-api',
  stream_name: 'logs.checkout',
};

const causalEntry = {
  feature_id: 'feat-checkout',
  name: 'checkout-api',
  stream_name: 'logs.checkout',
};

describe('getImpactedServices', () => {
  it('resolves blast radius entity entries backed by a service knowledge indicator', () => {
    const feature = mockFeature();

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([
      { key: 'checkout api', name: 'Checkout API', feature },
    ]);
  });

  it('resolves causal features backed by a service knowledge indicator', () => {
    const feature = mockFeature();

    expect(getImpactedServices(mockEvent({ causal_features: [causalEntry] }), [feature])).toEqual([
      { key: 'checkout api', name: 'Checkout API', feature },
    ]);
  });

  // Neither array alone is complete, so the list is their union.
  it('merges services named only by one of the two arrays', () => {
    const checkout = mockFeature();
    const payments = mockFeature({
      uuid: 'feat-payments',
      id: 'payments-api',
      title: 'Payments API',
    });
    const event = mockEvent({
      blast_radius: [entityEntry],
      causal_features: [{ ...causalEntry, feature_id: 'feat-payments', name: 'payments-api' }],
    });

    expect(getImpactedServices(event, [checkout, payments]).map(({ name }) => name)).toEqual([
      'Checkout API',
      'Payments API',
    ]);
  });

  it('collapses a service named by both arrays into one entry', () => {
    const event = mockEvent({ blast_radius: [entityEntry], causal_features: [causalEntry] });

    expect(getImpactedServices(event, [mockFeature()])).toHaveLength(1);
  });

  // The reported duplicate: `elasticsearch` in one stream and `Elasticsearch` in another are two
  // knowledge indicators with two uuids, and rendered as two chips before this collapsing.
  it('collapses knowledge indicators whose titles differ only in casing', () => {
    const lower = mockFeature({ uuid: 'feat-es-a', id: 'elasticsearch', title: 'elasticsearch' });
    const upper = mockFeature({
      uuid: 'feat-es-b',
      id: 'elasticsearch',
      stream_name: 'logs.search',
      title: 'Elasticsearch',
    });
    const event = mockEvent({
      blast_radius: [
        { ...entityEntry, feature_id: 'feat-es-a' },
        { ...entityEntry, feature_id: 'feat-es-b' },
      ],
    });

    expect(getImpactedServices(event, [lower, upper])).toEqual([
      { key: 'elasticsearch', name: 'elasticsearch', feature: lower },
    ]);
  });

  it('labels a service from its knowledge indicator, not the free-text entry name', () => {
    const event = mockEvent({ blast_radius: [{ ...entityEntry, name: 'checkout-api' }] });

    expect(getImpactedServices(event, [mockFeature({ title: 'Checkout API' })])[0].name).toBe(
      'Checkout API'
    );
  });

  it('falls back to the knowledge indicator id when it has no title', () => {
    const event = mockEvent({ blast_radius: [entityEntry] });

    expect(getImpactedServices(event, [mockFeature({ title: undefined })])[0].name).toBe(
      'checkout-api'
    );
    expect(getImpactedServices(event, [mockFeature({ title: '  ' })])[0].name).toBe('checkout-api');
  });

  // Both fields are unbounded below, so a blank pair would otherwise chip with a count and no name.
  it('drops a knowledge indicator whose title and id are both blank', () => {
    const event = mockEvent({ blast_radius: [entityEntry] });

    expect(getImpactedServices(event, [mockFeature({ title: '  ', id: '' })])).toEqual([]);
    expect(getImpactedServices(event, [mockFeature({ title: undefined, id: '   ' })])).toEqual([]);
  });

  it('matches a feature by its id when the entry does not reference the uuid', () => {
    const feature = mockFeature({ uuid: 'some-other-uuid', id: 'feat-checkout' });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toHaveLength(
      1
    );
  });

  it('prefers a uuid match over another feature that reuses the same value as its id', () => {
    const byId = mockFeature({ uuid: 'unrelated-uuid', id: 'feat-checkout', title: 'By id' });
    const byUuid = mockFeature({ uuid: 'feat-checkout', id: 'unrelated-id', title: 'By uuid' });

    expect(
      getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [byId, byUuid])[0].feature
    ).toBe(byUuid);
  });

  // `Feature.type` and `Feature.subtype` are unconstrained strings written by a model, so casing is
  // not guaranteed.
  it('accepts an entity type and service subtype regardless of casing', () => {
    const feature = mockFeature({ type: 'Entity', subtype: 'Service' });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toHaveLength(
      1
    );
  });

  // A knowledge indicator's own type is the only gate that covers `causal_features[]`, which carry
  // no row type of their own.
  it.each(['dependency', 'infrastructure', 'technology', 'schema'])(
    'drops a %s knowledge indicator even when its subtype is service',
    (type) => {
      const feature = mockFeature({ type, subtype: 'service' });

      expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual(
        []
      );
      expect(getImpactedServices(mockEvent({ causal_features: [causalEntry] }), [feature])).toEqual(
        []
      );
    }
  );

  // An infrastructure row names a component, not a service an operator acts on — even when its
  // knowledge indicator claims the `service` subtype.
  it('drops infrastructure entries', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'infrastructure',
          feature_id: 'feat-ingress',
          title: 'Ingress controller',
          stream_name: 'logs.checkout',
        },
      ],
    });

    expect(getImpactedServices(event, [mockFeature({ uuid: 'feat-ingress' })])).toEqual([]);
  });

  // A dependency row names an edge — `source` → `target` behind one `feature_id` — so there is no
  // single subject to render.
  it('drops dependency entries', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'dependency',
          feature_id: 'feat-edge',
          source: 'checkout-api',
          target: 'payments-api',
          stream_name: 'logs.checkout',
        },
      ],
    });

    expect(getImpactedServices(event, [mockFeature({ uuid: 'feat-edge' })])).toEqual([]);
  });

  it('drops references whose knowledge indicator is not a service', () => {
    const feature = mockFeature({ subtype: 'database' });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([]);
    expect(getImpactedServices(mockEvent({ causal_features: [causalEntry] }), [feature])).toEqual(
      []
    );
  });

  it('drops references whose knowledge indicator has no subtype', () => {
    const feature = mockFeature({ subtype: undefined });

    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [feature])).toEqual([]);
  });

  it('drops references whose feature_id resolves to nothing', () => {
    expect(getImpactedServices(mockEvent({ blast_radius: [entityEntry] }), [])).toEqual([]);
  });

  it('never falls back to a stream name when an event names no services', () => {
    expect(getImpactedServices(mockEvent(), [mockFeature()])).toEqual([]);
  });
});

describe('getImpactedServiceStreamNames', () => {
  it('collects distinct streams from blast radius entities and causal features', () => {
    const events = [
      mockEvent({ blast_radius: [entityEntry] }),
      mockEvent({
        blast_radius: [
          {
            ...entityEntry,
            feature_id: 'feat-eis',
            name: 'eis-gateway',
            stream_name: 'logging-eis',
          },
        ],
        causal_features: [{ ...causalEntry, stream_name: 'logs.payments' }],
      }),
      mockEvent(),
    ];

    expect(getImpactedServiceStreamNames(events)).toEqual([
      'logs.checkout',
      'logging-eis',
      'logs.payments',
    ]);
  });

  it('skips streams of entries that describe no service', () => {
    const event = mockEvent({
      blast_radius: [
        {
          type: 'infrastructure',
          feature_id: 'feat-nodes',
          title: 'Wolfi Linux nodes',
          stream_name: 'logs.infra',
        },
        {
          type: 'dependency',
          feature_id: 'feat-edge',
          source: 'checkout-api',
          target: 'payments-api',
          stream_name: 'logs.edges',
        },
      ],
    });

    expect(getImpactedServiceStreamNames([event])).toEqual([]);
  });

  // `causal_features[].stream_name` is optional, unlike every blast radius row.
  it('skips causal features that declare no stream', () => {
    const event = mockEvent({
      blast_radius: [entityEntry],
      causal_features: [{ feature_id: 'feat-payments', name: 'payments-api' }],
    });

    expect(getImpactedServiceStreamNames([event])).toEqual(['logs.checkout']);
  });
});
