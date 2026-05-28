/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// EMH Phase 2: file does not exist yet. Implementer generates it from a
// `relationship_observations.schema.yaml` via `yarn openapi:generate`.
import { ListEntityRelationshipsRequestQuery } from './list_entity_relationships.gen';

describe('EMH Phase 2 — ListEntityRelationshipsRequestQuery (request-side Zod)', () => {
  describe('happy path — accepts every supported parameter', () => {
    it('parses a fully populated query', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({
        page: '2',
        per_page: '50',
        sort_field: '@timestamp',
        sort_order: 'desc',
        kind: 'accesses_frequently',
        target: 'host:laptopA',
        from: '2026-04-27T00:00:00.000Z',
        to: '2026-05-27T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    it('parses an empty query (all params optional — entity id comes from the path)', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({});
      expect(result.success).toBe(true);
    });

    it.each([
      ['accesses_frequently'],
      ['communicates_with'],
      ['administers'],
      ['depends_on'],
      ['owns'],
      ['supervises'],
    ])('accepts kind=%s', (kind) => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({ kind });
      expect(result.success).toBe(true);
    });

    it.each([['asc'], ['desc']])('accepts sort_order=%s', (sortOrder) => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({ sort_order: sortOrder });
      expect(result.success).toBe(true);
    });

    it('coerces page and per_page from query-string numerics', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({
        page: '3',
        per_page: '25',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.per_page).toBe(25);
      }
    });
  });

  describe('rejection — bad inputs', () => {
    it('rejects sort_order outside the asc/desc enum', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({ sort_order: 'sideways' });
      expect(result.success).toBe(false);
    });

    it('rejects a non-ISO-8601 from value', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({ from: 'yesterday' });
      expect(result.success).toBe(false);
    });

    it('rejects a non-ISO-8601 to value', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({ to: '2026/05/27' });
      expect(result.success).toBe(false);
    });

    it('rejects a page value below 1', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({ page: '0' });
      expect(result.success).toBe(false);
    });

    it('rejects a per_page value below 1', () => {
      const result = ListEntityRelationshipsRequestQuery.safeParse({ per_page: '0' });
      expect(result.success).toBe(false);
    });
  });
});
