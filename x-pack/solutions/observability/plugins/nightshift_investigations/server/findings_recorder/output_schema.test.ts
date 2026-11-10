/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_HYPOTHESES,
  MAX_IMPACT_TOOL_ENTITIES,
} from '@kbn/agentic-investigations-plugin/common';
import {
  FINDINGS_JSON_SCHEMA,
  LIVE_FINDINGS_JSON_SCHEMA,
  findingsOutputSchema,
  entityIdFor,
  limitEvidence,
  limitFindings,
  limitImpactMap,
  limitEvents,
  classifyEntityType,
  withoutEntityName,
  limitDescriptionBullets,
  limitBulletList,
} from './output_schema';

describe('findings output', () => {
  it('sets no hard size limits in the schema the model is held to', () => {
    expect(JSON.stringify(FINDINGS_JSON_SCHEMA)).not.toMatch(/maxLength|maxItems/);
  });

  it('accepts long text and trims it to the store limits', () => {
    const long = 'x'.repeat(20_000);
    const parsed = findingsOutputSchema.safeParse({
      summary: long,
      verdict: long,
      impact_summary: long,
      impact_entities: Array.from({ length: 20 }, (_, i) => ({ name: `svc-${i}` })),
      hypotheses: Array.from({ length: MAX_HYPOTHESES + 10 }, () => ({
        candidate: long,
        confidence: 1.4,
        status: 'investigating' as const,
        reason: long,
      })),
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const limited = limitFindings(parsed.data);
    expect(limited.summary.length).toBeLessThan(long.length);
    expect(limited.verdict?.length).toBeLessThan(long.length);
    expect(limited.impact_summary?.length).toBeLessThan(long.length);
    expect(limited.impact_entities).toHaveLength(MAX_IMPACT_TOOL_ENTITIES);
    expect(limited.hypotheses).toHaveLength(MAX_HYPOTHESES);
    expect(limited.hypotheses[0].confidence).toBe(1);
    expect(limited.hypotheses[0].candidate.length).toBeLessThan(long.length);
  });

  it('still rejects a record without a summary or with an unknown status', () => {
    expect(findingsOutputSchema.safeParse({ hypotheses: [] }).success).toBe(false);
    expect(
      findingsOutputSchema.safeParse({
        summary: 's',
        hypotheses: [{ candidate: 'c', confidence: 0.5, status: 'maybe' }],
      }).success
    ).toBe(false);
  });
});

describe('evidence', () => {
  const chart = (points: Array<{ x: string; y: number }>) => ({
    type: 'line' as const,
    title: 'Errors per minute, 01:00 to 01:30 UTC',
    x_axis: { type: 'time' as const },
    y_axis: { unit: 'number' as const },
    series: [{ name: 'errors', points }],
    annotations: [{ x: '2026-08-09T01:12:00Z', label: 'deploy' }],
  });
  const points = [
    { x: '2026-08-09T01:10:00Z', y: 3 },
    { x: '2026-08-09T01:11:00Z', y: 412 },
    { x: '2026-08-09T01:12:00Z', y: 398 },
  ];

  it('keeps a chart that fits and its description', () => {
    expect(limitEvidence({ description: 'Errors jumped.', chart: chart(points) })).toEqual({
      description: 'Errors jumped.',
      chart: chart(points),
    });
  });

  it('keeps at most two threshold lines with a finite level', () => {
    const kept = limitEvidence({
      chart: {
        ...chart(points),
        thresholds: [
          { y: 30, label: 'Alert at 30%' },
          { y: Number.NaN, label: 'bad' },
          { y: 50, label: 'b' },
          { y: 60, label: 'c' },
        ],
      },
    });
    expect(kept?.chart?.thresholds).toEqual([
      { y: 30, label: 'Alert at 30%' },
      { y: 50, label: 'b' },
    ]);
  });

  it('drops points that are not finite numbers or have no x, and a chart left with none', () => {
    const kept = limitEvidence({
      chart: chart([...points, { x: '', y: 5 }, { x: '2026-08-09T01:13:00Z', y: Number.NaN }]),
    });
    expect(kept?.chart?.series[0].points).toHaveLength(3);
    expect(limitEvidence({ description: 'Only text.', chart: chart([]) })).toEqual({
      description: 'Only text.',
    });
    expect(limitEvidence({ chart: chart([]) })).toBeUndefined();
  });

  it('writes epoch bucket keys as ISO times and drops points that are not times', () => {
    const kept = limitEvidence({
      chart: chart([
        { x: '1786324200000', y: 3 },
        { x: '1786324260', y: 412 },
        { x: 'around then', y: 9 },
        { x: '2026-08-09T01:12:00Z', y: 398 },
      ]),
    });
    expect(kept?.chart?.series[0].points.map(({ x }) => x)).toEqual([
      '2026-08-10T01:10:00.000Z',
      '2026-08-10T01:11:00.000Z',
      '2026-08-09T01:12:00Z',
    ]);
    expect(limitEvidence({ chart: chart([{ x: 'later', y: 1 }]) })).toBeUndefined();
  });

  it('trims a chart to the store limits', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      x: new Date(Date.UTC(2026, 7, 9, 1, i)).toISOString(),
      y: i,
    }));
    const kept = limitEvidence({
      chart: {
        ...chart(many),
        series: Array.from({ length: 9 }, () => ({ name: 'a', points: many })),
      },
    });
    expect(kept?.chart?.series).toHaveLength(5);
    expect(kept?.chart?.series[0].points).toHaveLength(100);
  });

  it('thins an oversized series across the whole window, keeping the first and last point', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      x: new Date(Date.UTC(2026, 7, 9, 1, i)).toISOString(),
      y: i,
    }));
    const [{ points: kept }] = limitEvidence({ chart: chart(many) })?.chart?.series ?? [];
    expect(kept).toHaveLength(100);
    expect(kept[0]).toEqual(many[0]);
    expect(kept[99]).toEqual(many[299]);
  });

  it('keeps every point of a series that fits', () => {
    const exact = Array.from({ length: 100 }, (_, i) => ({
      x: new Date(Date.UTC(2026, 7, 9, 1, i)).toISOString(),
      y: i,
    }));
    expect(limitEvidence({ chart: chart(exact) })?.chart?.series[0].points).toEqual(exact);
  });

  it('lets a record retract the impact evidence with null, and keeps omission distinct', () => {
    const base = { summary: 's', impact_summary: 'x', hypotheses: [] };
    const retract = findingsOutputSchema.safeParse({ ...base, impact_evidence: null });
    expect(retract.success).toBe(true);
    if (!retract.success) return;
    expect(limitFindings(retract.data).impact_evidence).toBeNull();
    const omit = findingsOutputSchema.safeParse(base);
    if (!omit.success) throw new Error('expected a valid record');
    expect(limitFindings(omit.data).impact_evidence).toBeUndefined();
  });

  it('carries evidence through the record, keeping at most two items per hypothesis', () => {
    const parsed = findingsOutputSchema.safeParse({
      summary: 's',
      impact_summary: 'Checkout failed.',
      impact_evidence: { chart: chart(points) },
      hypotheses: [
        {
          candidate: 'Bad deploy',
          confidence: 0.8,
          status: 'confirmed',
          evidence: [{ description: 'a' }, { description: 'b' }, { description: 'c' }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const record = limitFindings(parsed.data);
    expect(record.impact_evidence?.chart?.series[0].points).toHaveLength(3);
    expect(record.hypotheses[0].evidence).toHaveLength(2);
  });
});

describe('proposals', () => {
  const parse = (proposals: unknown) => {
    const parsed = findingsOutputSchema.safeParse({ summary: 's', hypotheses: [], proposals });
    if (!parsed.success) throw new Error(parsed.error.message);
    return limitFindings(parsed.data).proposals;
  };

  it('keeps at most three, trims the title and the comment to the store limits', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ title: ` t${i} `, comment: `c${i}` }));
    expect(parse(many)).toHaveLength(3);
    const [long] = parse([{ title: 'x'.repeat(400), comment: 'y'.repeat(9_000) }]) ?? [];
    expect(long.title).toHaveLength(256);
    expect(long.comment).toHaveLength(8_192);
    expect(parse([{ title: ' trimmed ', comment: 'c' }])?.[0].title).toBe('trimmed');
  });

  it('keeps an impact and a confidence the store knows, and leaves out one it does not', () => {
    const [known, unknown] =
      parse([
        { title: 'a', comment: 'c', impact: 'low', confidence: 'high' },
        { title: 'b', comment: 'c', impact: 'catastrophic', confidence: 'certain' },
      ]) ?? [];
    expect(known).toMatchObject({ impact: 'low', confidence: 'high' });
    expect(unknown).not.toHaveProperty('impact');
    expect(unknown).not.toHaveProperty('confidence');
  });

  it('leaves the field out of the record when the model sent none', () => {
    expect(parse(undefined)).toBeUndefined();
  });

  it('asks for proposals in the final schema only', () => {
    expect(FINDINGS_JSON_SCHEMA.properties).toHaveProperty('proposals');
    expect(LIVE_FINDINGS_JSON_SCHEMA.properties).not.toHaveProperty('proposals');
  });
});

describe('entity evidence', () => {
  it('trims the evidence of each entity to what the stores accept', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      x: new Date(Date.UTC(2026, 7, 9, 1, i)).toISOString(),
      y: i,
    }));
    const parsed = findingsOutputSchema.safeParse({
      summary: 's',
      impact_summary: 'x',
      impact_entities: [
        {
          name: 'checkout',
          evidence: {
            description: 'Errors rose.',
            chart: {
              type: 'line',
              title: 'Errors per minute',
              x_axis: { type: 'time' },
              y_axis: { unit: 'number' },
              series: [{ name: 'errors', points: many }],
            },
          },
        },
        {
          name: 'payments',
          evidence: {
            chart: { type: 'line', title: 't', x_axis: { type: 'time' }, y_axis: {}, series: [] },
          },
        },
      ],
      hypotheses: [],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const [checkout, payments] = limitFindings(parsed.data).impact_entities ?? [];
    expect(checkout.evidence?.chart?.series[0].points).toHaveLength(100);
    expect(payments.evidence).toBeUndefined();
  });
});

describe('classifyEntityType', () => {
  it('draws only services as circles; databases and queues are rounded squares with an icon', () => {
    expect(classifyEntityType('postgres_database')).toEqual({
      kind: 'infrastructure',
      euiIcon: 'logoPostgres',
    });
    expect(classifyEntityType('elasticsearch_cluster')).toEqual({
      kind: 'infrastructure',
      euiIcon: 'logoElasticsearch',
    });
    expect(classifyEntityType('message_queue')).toEqual({
      kind: 'infrastructure',
      euiIcon: 'package',
    });
    expect(classifyEntityType('host')).toEqual({ kind: 'infrastructure' });
    expect(classifyEntityType('k8s.deployment')).toEqual({
      kind: 'infrastructure',
      euiIcon: 'logoKubernetes',
    });
    expect(classifyEntityType('java_service')).toEqual({ kind: 'service' });
  });

  it('classifies a new type the model left bare, and leaves a known one to the catalog', () => {
    const map = {
      entities: [
        { id: 'ship', type: 'k8s.deployment' },
        { id: 'db', type: 'known_db' },
      ],
      relationships: [],
    };
    const record = limitImpactMap(map, new Set(['known_db']));
    expect(record?.entity_types).toEqual([
      expect.objectContaining({
        id: 'k8s.deployment',
        kind: 'infrastructure',
        icon: { eui_icon: 'logoKubernetes' },
      }),
    ]);
  });
});

describe('a bare k8s type', () => {
  it('becomes a Kubernetes node when a pod runs on it', () => {
    const record = limitImpactMap({
      entities: [
        { id: 'shipping-pod', type: 'k8s.pod' },
        { id: 'gke-pool-1', type: 'k8s' },
        { id: 'other', type: 'k8s' },
      ],
      relationships: [{ source: 'shipping-pod', target: 'gke-pool-1', type: 'runs_on' }],
    });
    expect(record?.entities.map(({ id, type_id: typeId }) => [id, typeId])).toEqual([
      ['shipping-pod', 'k8s.pod'],
      ['gke-pool-1', 'k8s.node'],
      ['other', 'k8s'],
    ]);
  });
});

describe('impact map metadata', () => {
  it('teaches a known type only the fields it does not already have', () => {
    const known = new Map([
      [
        'k8s.deployment',
        {
          id: 'k8s.deployment',
          label: 'Kubernetes deployment',
          kind: 'infrastructure' as const,
          metadata_fields: [{ key: 'k8s.deployment.name', label: 'Deployment' }],
        },
      ],
    ]);
    const record = limitImpactMap(
      {
        entities: [
          {
            id: 'shipping',
            type: 'k8s.deployment',
            metadata: [
              { key: 'k8s.deployment.name', value: 'shipping' },
              { key: 'k8s.namespace.name', value: 'shop' },
              { key: 'app.owner_team', value: 'logistics', label: 'Owner team' },
            ],
          },
        ],
        relationships: [],
      },
      new Set(['k8s.deployment']),
      known
    );
    expect(record?.entity_types).toEqual([
      {
        id: 'k8s.deployment',
        label: 'Kubernetes deployment',
        kind: 'infrastructure',
        metadata_fields: [{ key: 'app.owner_team', label: 'Owner team' }],
      },
    ]);
  });

  it('cleans keys and values, keeps featured, and teaches a new type its fields', () => {
    const record = limitImpactMap({
      entities: [
        {
          id: 'shipping',
          type: 'k8s.deployment',
          metadata: [
            { key: 'K8s Namespace.Name', value: ' shop ', featured: true },
            { key: 'cloud.availability_zone', value: 'eu-west-1b' },
            { key: 'cloud.availability_zone', value: 'duplicate' },
            { key: 'empty', value: '   ' },
            { key: 'team pager', value: 'oncall', label: 'Pager' },
          ],
        },
      ],
      relationships: [],
    });
    expect(record?.entities[0].metadata).toEqual([
      { key: 'k8s_namespace.name', value: 'shop', featured: true },
      { key: 'cloud.availability_zone', value: 'eu-west-1b' },
      { key: 'team_pager', value: 'oncall', label: 'Pager' },
    ]);
    expect(record?.entity_types[0].metadata_fields).toEqual([
      { key: 'k8s_namespace.name', label: 'K8s namespace name', featured: true },
      { key: 'cloud.availability_zone', label: 'Availability zone' },
      { key: 'team_pager', label: 'Pager' },
    ]);
  });
});

describe('impact map', () => {
  it('carries where an entity sits, where it was learned from and how sure the agent is', () => {
    const map = limitImpactMap({
      entities: [
        { id: 'zone-b', type: 'cloud.availability_zone' },
        {
          id: 'allocator',
          type: 'controller',
          parent: 'zone-b',
          found_in: 'config',
          confidence: 'high',
        },
        { id: 'self', type: 'controller', parent: 'self' },
      ],
      relationships: [
        {
          source: 'allocator',
          target: 'zone-b',
          type: 'runs_on',
          label: 'pinned',
          found_in: 'inferred',
          confidence: 'low',
        },
      ],
    });

    const [zone, allocator, self] = map?.entities ?? [];
    expect(zone).not.toHaveProperty('parent_id');
    expect(allocator).toMatchObject({ parent_id: 'zone-b', source: 'config', confidence: 'high' });
    expect(self).not.toHaveProperty('parent_id');
    expect(map?.relationships[0]).toMatchObject({
      label: 'pinned',
      source: 'inferred',
      confidence: 'low',
    });
  });

  it('keeps a trimmed entity description and cuts a long one', () => {
    const map = limitImpactMap({
      entities: [
        { id: 'checkout', type: 'java_service', description: '  Places customer orders.  ' },
        { id: 'cart', type: 'java_service', description: 'x'.repeat(500) },
        { id: 'quote', type: 'java_service', description: '   ' },
      ],
      relationships: [],
    });

    const [checkout, cart, quote] = map?.entities ?? [];
    expect(checkout.description).toBe('Places customer orders.');
    expect(cart.description).toHaveLength(400);
    expect(quote).not.toHaveProperty('description');
  });

  it('builds the store shape: types from the icon fields, normalised ids, no dangling edges', () => {
    const map = limitImpactMap({
      title: ' Checkout failures ',
      entities: [
        {
          id: 'checkout',
          type: 'Java Service',
          agent_name: 'java',
          role: 'symptom',
          impacted: true,
        },
        { id: 'checkout', type: 'java_service' },
        { id: 'payments-db', type: 'PostgreSQL', span_type: 'db', span_subtype: 'postgresql' },
        { id: 'cart', label: 'Cart', type: 'java_service', alert_count: 2.4, health: 'healthy' },
      ],
      relationships: [
        { source: 'checkout', target: 'payments-db', type: 'Reads From', on_critical_path: true },
        { source: 'checkout', target: 'ghost', type: 'calls' },
        { source: 'checkout', target: 'cart', type: 'calls', on_critical_path: false },
      ],
    });

    expect(map).toEqual({
      title: 'Checkout failures',
      entities: [
        {
          id: 'checkout',
          type_id: 'java_service',
          label: 'checkout',
          annotations: { role: 'symptom', impacted: true },
        },
        { id: 'payments-db', type_id: 'db.postgresql', label: 'payments-db' },
        {
          id: 'cart',
          type_id: 'java_service',
          label: 'Cart',
          annotations: { health: 'healthy', alert_count: 2 },
        },
      ],
      relationships: [
        {
          type_id: 'reads_from',
          source_id: 'checkout',
          target_id: 'payments-db',
          on_critical_path: true,
        },
        { type_id: 'calls', source_id: 'checkout', target_id: 'cart' },
      ],
      entity_types: [
        {
          id: 'java_service',
          label: 'Java service',
          kind: 'service',
          icon: { agent_name: 'java' },
        },
        {
          id: 'db.postgresql',
          label: 'Db postgresql',
          kind: 'infrastructure',
          icon: { eui_icon: 'logoPostgres' },
        },
      ],
      relationship_types: [
        { id: 'reads_from', label: 'reads from' },
        { id: 'calls', label: 'calls' },
      ],
    });
  });

  it('leaves the map out of the record when none of its entities fit', () => {
    const record = limitFindings({
      summary: 's',
      hypotheses: [],
      impact_map: { entities: [{ id: '  ', type: 'x' }], relationships: [] },
    });
    expect(record).not.toHaveProperty('impact_map');
  });

  it('asks for the map in both schemas', () => {
    expect(FINDINGS_JSON_SCHEMA.properties).toHaveProperty('impact_map');
    expect(LIVE_FINDINGS_JSON_SCHEMA.properties).toHaveProperty('impact_map');
  });
});

describe('entityIdFor', () => {
  it('uses the name when it fits the id limit', () => {
    expect(entityIdFor('checkout')).toBe('checkout');
    expect(entityIdFor('a'.repeat(256))).toBe('a'.repeat(256));
  });

  it('bounds a longer name, stably, and keeps names with the same start apart', () => {
    const first = `${'a'.repeat(300)}-one`;
    const second = `${'a'.repeat(300)}-two`;
    expect(entityIdFor(first).length).toBeLessThanOrEqual(256);
    expect(entityIdFor(first)).toBe(entityIdFor(first));
    expect(entityIdFor(first)).not.toBe(entityIdFor(second));
  });
});

describe('limitEvents', () => {
  const at = '2026-11-07T10:00:30Z';

  it('keeps where the data of an event came from and hides credentials in it', () => {
    const [event] = limitEvents([
      {
        kind: 'failure',
        title: 'Errors rose',
        at,
        entity: 'checkout',
        data_source: {
          name: 'Elasticsearch',
          query: { language: 'ES|QL', text: 'FROM logs-* | LIMIT 5' },
          api_call: {
            method: 'post',
            endpoint: '/_query',
            payload: '{"query":"x","api_key":"abc123"}',
          },
        },
      },
    ]);
    expect(event.data_source).toEqual({
      name: 'Elasticsearch',
      query: { language: 'ES|QL', text: 'FROM logs-* | LIMIT 5' },
      api_call: {
        method: 'POST',
        endpoint: '/_query',
        payload: '{"query":"x","api_key":"[hidden]"}',
      },
    });
  });

  it('places events on an entity or a relationship and gives them stable ids', () => {
    const [onEntity, onEdge] = limitEvents([
      { kind: 'change', title: ' Deployed v2 ', at, entity: 'checkout' },
      { kind: 'failure', title: 'Calls timed out', at, relationship: { source: 'a', target: 'b' } },
    ]);
    expect(onEntity).toEqual({
      id: 'change:checkout:2026-11-07T10:00',
      kind: 'change',
      title: 'Deployed v2',
      at: '2026-11-07T10:00:30.000Z',
      entity_id: 'checkout',
    });
    expect(onEdge.relationship_id).toBe('a->b');
  });

  it('keeps a finding or a response without a target and drops other events without one', () => {
    const kept = limitEvents([
      { kind: 'response', title: 'Status page updated', at },
      { kind: 'investigation', title: 'Bad deploy confirmed', at },
      { kind: 'failure', title: 'Something failed', at },
    ]);
    expect(kept.map(({ kind }) => kind)).toEqual(['response', 'investigation']);
  });

  it('drops an event whose time cannot be read, and merges repeats of one event', () => {
    const kept = limitEvents([
      { kind: 'alert', title: 'Fired', at: 'soon', entity: 'x' },
      { kind: 'alert', title: 'Fired', at, entity: 'x' },
      { kind: 'alert', title: 'Fired again', at: '2026-11-07T10:00:50Z', entity: 'x' },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].title).toBe('Fired again');
  });
});

describe('withoutEntityName', () => {
  it('drops the entity name from a type', () => {
    expect(withoutEntityName('shipping_service', ['shipping'])).toBe('service');
    expect(withoutEntityName('shipping', ['shipping'])).toBe('service');
    expect(withoutEntityName('k8s_deployment', ['shipping'])).toBe('k8s_deployment');
  });
});

describe('limitDescriptionBullets', () => {
  it('keeps the first four bullets', () => {
    const text = ['- a', '- b', '- c', '- d', '- e', '- f'].join('\n');
    expect(limitDescriptionBullets(text)).toBe('- a\n- b\n- c\n- d');
  });

  it('keeps a lead sentence above its bullets', () => {
    const text = 'Calls failed from 21:10Z.\n- 66 of 66 failed\n- Still failing at 22:00Z';
    expect(limitDescriptionBullets(text)).toBe(
      'Calls failed from 21:10Z.\n\n- 66 of 66 failed\n- Still failing at 22:00Z'
    );
  });

  it('turns a paragraph into a lead sentence and at most four short bullets', () => {
    const text =
      'A new pod started at 16:49Z. It replaced the old pod. No event record exists for this change. ' +
      'A direct query returned zero rows. A fifth sentence is dropped.';
    expect(limitDescriptionBullets(text).split('\n')).toEqual([
      'A new pod started at 16:49Z.',
      '',
      '- It replaced the old pod.',
      '- No event record exists for this change.',
      '- A direct query returned zero rows.',
      '- A fifth sentence is dropped.',
    ]);
  });

  it('cuts a very long bullet at a word', () => {
    const long = `- ${'word '.repeat(80)}`;
    expect(limitDescriptionBullets(long).length).toBeLessThanOrEqual(205);
  });
});

describe('limitBulletList', () => {
  it('turns a paragraph into short bullets', () => {
    const text = 'Alert fired. Shipping pod crashed. A deploy changed it. Fourth. Fifth. Sixth.';
    expect(limitBulletList(text, 3, 160).split('\n')).toEqual([
      '- Alert fired.',
      '- Shipping pod crashed.',
      '- A deploy changed it.',
    ]);
  });

  it('keeps bullets and never cuts inside an event link', () => {
    const link = '[the shipping pod crashed repeatedly](event:failure:e1:2026-11-06T01:00)';
    const out = limitBulletList(`- Something happened because ${link}\n- Two`, 5, 50);
    expect(out).not.toMatch(/\[[^\]]*$|\]\([^)]*$/);
    expect(out.split('\n')).toHaveLength(2);
  });
});
