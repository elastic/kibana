/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListEntityRelationshipsRequestQuery } from './list_entity_relationships.gen';
import { RELATIONSHIP_KINDS } from './relationship_metadata';

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

  describe('TS RELATIONSHIP_KINDS ↔ YAML kind enum drift guard', () => {
    // The Zod `kind` field is generated from the YAML enum. Reach into the
    // generated schema and read the enum's values so that any drift between
    // the TS const and the YAML source surfaces here.
    const kindField = ListEntityRelationshipsRequestQuery.shape.kind;
    // `kind` is `z.enum([...]).optional()`. ZodOptional → unwrap() → ZodEnum.
    const kindEnumOptions = (
      kindField as unknown as { unwrap: () => { options: readonly string[] } }
    ).unwrap().options;

    it('the YAML-sourced kind enum equals RELATIONSHIP_KINDS (same values, same order)', () => {
      expect(kindEnumOptions).toEqual([...RELATIONSHIP_KINDS]);
    });

    it('the YAML-sourced kind enum has the same length as RELATIONSHIP_KINDS', () => {
      expect(kindEnumOptions).toHaveLength(RELATIONSHIP_KINDS.length);
    });

    it.each([...RELATIONSHIP_KINDS])(
      'YAML-sourced kind enum contains TS RELATIONSHIP_KINDS member %s',
      (kind) => {
        expect(kindEnumOptions).toContain(kind);
      }
    );

    it('TS RELATIONSHIP_KINDS contains every YAML-sourced kind enum member', () => {
      for (const kind of kindEnumOptions) {
        expect((RELATIONSHIP_KINDS as readonly string[]).includes(kind)).toBe(true);
      }
    });
  });
});
