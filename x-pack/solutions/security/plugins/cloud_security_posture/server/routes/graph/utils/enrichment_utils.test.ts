/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rebuildDocData, addValuesToSet } from './enrichment_utils';
import type { EntityEnrichmentFields } from '../fetch_entity_enrichment';

describe('addValuesToSet', () => {
  it('adds a scalar value', () => {
    const set = new Set<string>();
    addValuesToSet(set, 'a', { dropEmpty: false });
    expect([...set]).toEqual(['a']);
  });

  it('adds every element of an array value', () => {
    const set = new Set<string>();
    addValuesToSet(set, ['a', 'b'], { dropEmpty: false });
    expect([...set]).toEqual(['a', 'b']);
  });

  it('unions into an existing set and deduplicates', () => {
    const set = new Set<string>(['a']);
    addValuesToSet(set, ['a', 'b'], { dropEmpty: false });
    expect([...set]).toEqual(['a', 'b']);
  });

  it('ignores null and undefined values', () => {
    const set = new Set<string>();
    addValuesToSet(set, null, { dropEmpty: false });
    addValuesToSet(set, undefined, { dropEmpty: false });
    expect([...set]).toEqual([]);
  });

  it('keeps empty strings when dropEmpty is false', () => {
    const set = new Set<string>();
    addValuesToSet(set, ['', 'a'], { dropEmpty: false });
    expect([...set]).toEqual(['', 'a']);
  });

  it('drops the empty-string sentinel when dropEmpty is true', () => {
    const set = new Set<string>();
    addValuesToSet(set, ['', 'a'], { dropEmpty: true });
    expect([...set]).toEqual(['a']);
  });
});

describe('rebuildDocData', () => {
  it('returns empty array for empty input', () => {
    const result = rebuildDocData([], new Map());
    expect(result).toEqual([]);
  });

  it('returns item unchanged when JSON parse fails', () => {
    const invalid = 'not-valid-json';
    const result = rebuildDocData([invalid], new Map());
    expect(result).toEqual([invalid]);
  });

  it('returns item unchanged when no id in doc', () => {
    const noId = JSON.stringify({ type: 'entity', sourceFields: {} });
    const result = rebuildDocData([noId], new Map());
    expect(result).toEqual([noId]);
  });

  it('applies availableInEntityStore: false when entity not in enrichment map', () => {
    const item = JSON.stringify({
      id: 'user:alice',
      type: 'entity',
      sourceFields: { 'user.name': 'alice' },
    });
    const result = rebuildDocData([item], new Map());

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.entity.availableInEntityStore).toBe(false);
    expect(doc.entity.sourceFields).toEqual({ 'user.name': 'alice' });
    expect(doc.sourceFields).toBeUndefined();
  });

  it('applies availableInEntityStore: true and enrichment fields when entity found', () => {
    const item = JSON.stringify({
      id: 'user:alice',
      type: 'entity',
      sourceFields: { 'user.name': 'alice' },
    });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        {
          name: 'Alice Smith',
          type: 'user',
          subType: 'admin',
          engineType: 'ecs',
          hostIps: ['10.0.0.1'],
        },
      ],
    ]);

    const result = rebuildDocData([item], enrichmentMap);

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.entity.availableInEntityStore).toBe(true);
    expect(doc.entity.name).toBe('Alice Smith');
    expect(doc.entity.type).toBe('user');
    expect(doc.entity.sub_type).toBe('admin');
    expect(doc.entity.engine_type).toBe('ecs');
    expect(doc.entity.host).toEqual({ ip: ['10.0.0.1'] });
    expect(doc.entity.sourceFields).toEqual({ 'user.name': 'alice' });
    expect(doc.sourceFields).toBeUndefined();
  });

  it('moves sourceFields from top-level into entity object (events docData format)', () => {
    const item = JSON.stringify({
      id: 'host:server1',
      type: 'entity',
      sourceFields: { 'host.name': 'server1', 'host.id': 'h1' },
    });

    const result = rebuildDocData([item], new Map());

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.sourceFields).toBeUndefined();
    expect(doc.entity.sourceFields).toEqual({ 'host.name': 'server1', 'host.id': 'h1' });
  });

  it('handles sourceFields already inside existing entity object (entity store docData format)', () => {
    const item = JSON.stringify({
      id: 'host:server1',
      type: 'entity',
      entity: {
        availableInEntityStore: true,
        sourceFields: { 'host.name': 'server1' },
        name: 'server1',
      },
    });

    const result = rebuildDocData([item], new Map());

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.sourceFields).toBeUndefined();
    expect(doc.entity.sourceFields).toEqual({ 'host.name': 'server1' });
    expect(doc.entity.availableInEntityStore).toBe(false);
  });

  it('falls back to enrichment sourceFields when input doc has no sourceFields', () => {
    // Relationship target docData has no sourceFields — enrichment provides them
    const item = JSON.stringify({ id: 'user:alice', type: 'entity' });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        {
          name: 'Alice',
          type: 'user',
          subType: null,
          engineType: null,
          hostIps: [],
          sourceFields: { 'user.id': 'alice', 'user.email': 'alice@example.com' },
        },
      ],
    ]);

    const result = rebuildDocData([item], enrichmentMap);

    const doc = JSON.parse(result[0]);
    expect(doc.entity.sourceFields).toEqual({
      'user.id': 'alice',
      'user.email': 'alice@example.com',
    });
    expect(doc.entity.availableInEntityStore).toBe(true);
  });

  it('prefers input sourceFields over enrichment sourceFields', () => {
    // sourceFields must describe the event fields that pointed at the entity, since consumers use
    // them to query logs-*. Entity-store values may not exist in the events at all.
    const item = JSON.stringify({
      id: 'user:alice',
      type: 'entity',
      sourceFields: { 'user.id': 'from-event' },
    });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:alice',
        {
          name: 'Alice',
          type: 'user',
          subType: null,
          engineType: null,
          hostIps: [],
          sourceFields: { 'user.id': 'from-enrichment' },
        },
      ],
    ]);

    const result = rebuildDocData([item], enrichmentMap);

    const doc = JSON.parse(result[0]);
    expect(doc.entity.sourceFields).toEqual({ 'user.id': 'from-event' });
  });

  it('unions event sourceFields for an enriched entity without substituting entity-store fields', () => {
    // The entity store carries only user.name / user.id, but the events also matched on
    // user.email — the field the EUID was composed from. All event identifiers must survive so
    // the follow-up ranking work (#262882) can pick among them.
    const makeEntry = (userName: string, userId: string) =>
      JSON.stringify({
        id: 'user:multi-actor-2@example.com@gcp',
        type: 'entity',
        sourceFields: {
          'user.name': userName,
          'user.email': 'multi-actor-2@example.com',
          'user.id': userId,
        },
      });
    const items = [
      makeEntry('Multi Actor 1', 'multi-actor-1@example.com'),
      makeEntry('Multi Actor 2', 'multi-actor-2@example.com'),
    ];
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'user:multi-actor-2@example.com@gcp',
        {
          name: 'MultiActor2',
          type: 'Identity',
          subType: 'GCP IAM User',
          engineType: 'user',
          hostIps: [],
          sourceFields: { 'user.name': 'MultiActor2', 'user.id': 'multi-actor-2@example.com' },
        },
      ],
    ]);

    const result = rebuildDocData(items, enrichmentMap);

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.entity.sourceFields).toEqual({
      'user.name': ['Multi Actor 1', 'Multi Actor 2'],
      'user.email': 'multi-actor-2@example.com',
      'user.id': ['multi-actor-1@example.com', 'multi-actor-2@example.com'],
    });
    // Enrichment still supplies entity metadata.
    expect(doc.entity.name).toBe('MultiActor2');
    expect(doc.entity.engine_type).toBe('user');
  });

  it('handles host.ip array in enrichment', () => {
    const item = JSON.stringify({ id: 'host:server1', type: 'entity', sourceFields: {} });
    const enrichmentMap = new Map<string, EntityEnrichmentFields>([
      [
        'host:server1',
        {
          name: 'server1',
          type: 'host',
          subType: null,
          engineType: null,
          hostIps: ['192.168.1.1', '10.0.0.1'],
        },
      ],
    ]);

    const result = rebuildDocData([item], enrichmentMap);

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.entity.host).toEqual({ ip: ['192.168.1.1', '10.0.0.1'] });
  });

  it('deduplicates entries with the same entity id and unions their sourceFields', () => {
    // Simulates two actorDocData strings produced for the same entity id when
    // MV_EXPAND user.email × MV_EXPAND user.id creates cross-product rows.
    const makeEntry = (email: string, userId: string) =>
      JSON.stringify({
        id: 'user:actor@example.com@gcp',
        type: 'entity',
        sourceFields: { 'user.email': email, 'user.id': userId },
      });

    const items = [
      makeEntry('actor@example.com', 'actor@example.com'),
      makeEntry('actor@example.com', 'other@example.com'), // cross-product duplicate
    ];

    const result = rebuildDocData(items, new Map());

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.id).toBe('user:actor@example.com@gcp');
    // user.email resolved to a single value, so it stays a scalar; user.id keeps both values.
    expect(doc.entity.sourceFields).toEqual({
      'user.email': 'actor@example.com',
      'user.id': ['actor@example.com', 'other@example.com'],
    });
  });

  it('collapses a full Cartesian product to one entry per entity id', () => {
    // A single event with user.name × user.email × user.id (2 values each) produces 8 rows
    // spanning 2 real entity ids. Each id must yield one entry carrying all values seen for it.
    const makeEntry = (id: string, userName: string, email: string, userId: string) =>
      JSON.stringify({
        id,
        type: 'entity',
        sourceFields: { 'user.name': userName, 'user.email': email, 'user.id': userId },
      });
    const ID_1 = 'user:multi-actor-1@example.com@gcp';
    const ID_2 = 'user:multi-actor-2@example.com@gcp';
    const NAME_1 = 'Multi Actor 1';
    const NAME_2 = 'Multi Actor 2';
    const EMAIL_1 = 'multi-actor-1@example.com';
    const EMAIL_2 = 'multi-actor-2@example.com';

    const items = [
      makeEntry(ID_1, NAME_1, EMAIL_1, EMAIL_1),
      makeEntry(ID_1, NAME_1, EMAIL_1, EMAIL_2),
      makeEntry(ID_2, NAME_1, EMAIL_2, EMAIL_1),
      makeEntry(ID_2, NAME_1, EMAIL_2, EMAIL_2),
      makeEntry(ID_1, NAME_2, EMAIL_1, EMAIL_1),
      makeEntry(ID_1, NAME_2, EMAIL_1, EMAIL_2),
      makeEntry(ID_2, NAME_2, EMAIL_2, EMAIL_1),
      makeEntry(ID_2, NAME_2, EMAIL_2, EMAIL_2),
    ];

    const result = rebuildDocData(items, new Map());

    expect(result).toHaveLength(2);
    const docs = result.map((r) => JSON.parse(r));
    expect(docs.map((d) => d.id)).toEqual([ID_1, ID_2]);
    expect(docs[0].entity.sourceFields).toEqual({
      'user.name': [NAME_1, NAME_2],
      'user.email': EMAIL_1,
      'user.id': [EMAIL_1, EMAIL_2],
    });
    expect(docs[1].entity.sourceFields).toEqual({
      'user.name': [NAME_1, NAME_2],
      'user.email': EMAIL_2,
      'user.id': [EMAIL_1, EMAIL_2],
    });
  });

  it('keeps doc-level fields from the grouped entries', () => {
    const makeEntry = (userId: string) =>
      JSON.stringify({
        id: 'user:alice',
        type: 'entity',
        index: '.ds-logs-gcp.audit-default-000001',
        sourceFields: { 'user.id': userId },
      });

    const result = rebuildDocData([makeEntry('alice'), makeEntry('alice2')], new Map());

    expect(result).toHaveLength(1);
    const doc = JSON.parse(result[0]);
    expect(doc.id).toBe('user:alice');
    expect(doc.type).toBe('entity');
    expect(doc.index).toBe('.ds-logs-gcp.audit-default-000001');
    // sourceFields moved from the top level into the entity object, and both entries' values
    // survived the grouping.
    expect(doc.sourceFields).toBeUndefined();
    expect(doc.entity.sourceFields).toEqual({ 'user.id': ['alice', 'alice2'] });
  });

  it('passes through unparseable and id-less entries alongside grouped ones', () => {
    const invalid = 'not-valid-json';
    const noId = JSON.stringify({ type: 'entity', sourceFields: {} });
    const withId = JSON.stringify({
      id: 'user:alice',
      type: 'entity',
      sourceFields: { 'user.id': 'alice' },
    });

    const result = rebuildDocData([invalid, withId, noId, withId], new Map());

    expect(result).toHaveLength(3);
    expect(result[0]).toBe(invalid);
    expect(JSON.parse(result[1]).id).toBe('user:alice');
    expect(result[2]).toBe(noId);
  });
});
