/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntitiesSearchBody, buildIndexSourceSearchBody } from './queries';

describe('Watchlist sync queries', () => {
  describe('buildIndexSourceSearchBody', () => {
    it('constructs search body with terms filter on identifier field', () => {
      const searchBody = buildIndexSourceSearchBody('user.name', ['jdoe', 'admin']);
      expect(searchBody.size).toBe(0);
      expect(searchBody.query?.bool?.must).toContainEqual({
        terms: { 'user.name': ['jdoe', 'admin'] },
      });
      expect(searchBody.aggs?.identifiers?.composite?.sources).toEqual([
        { identifier: { terms: { field: 'user.name' } } },
      ]);
      expect(searchBody.aggs?.identifiers?.composite?.size).toBe(100);
      expect(searchBody.runtime_mappings).toBeUndefined();
    });

    it('applies queryRule as KQL filter', () => {
      const searchBody = buildIndexSourceSearchBody(
        'user.name',
        ['jdoe'],
        undefined,
        100,
        'event.action: "login"'
      );
      const must = searchBody.query?.bool?.must as unknown[];
      // terms filter + default range filter + KQL filter
      expect(must).toHaveLength(3);
      expect(must[0]).toEqual({ terms: { 'user.name': ['jdoe'] } });
    });

    it('handles pagination with afterKey', () => {
      const afterKey = { identifier: 'jdoe' };
      const searchBody = buildIndexSourceSearchBody('user.name', ['jdoe'], afterKey);
      expect(searchBody.aggs?.identifiers?.composite?.after).toEqual(afterKey);
    });

    it('uses custom page size', () => {
      const searchBody = buildIndexSourceSearchBody('user.name', ['jdoe'], undefined, 50);
      expect(searchBody.aggs?.identifiers?.composite?.size).toBe(50);
    });

    it('does not add KQL filter when queryRule is undefined', () => {
      const searchBody = buildIndexSourceSearchBody('host.name', ['server-1']);
      // terms filter + default range filter
      expect(searchBody.query?.bool?.must).toHaveLength(2);
    });

    it('applies @timestamp range filter from provided range', () => {
      const range = { start: 'now-7d', end: 'now' };
      const searchBody = buildIndexSourceSearchBody(
        'user.name',
        ['jdoe'],
        undefined,
        100,
        undefined,
        range
      );
      expect(searchBody.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: 'now-7d', lte: 'now' } },
      });
    });

    it('uses default 10-day range when range is not provided', () => {
      const searchBody = buildIndexSourceSearchBody('user.name', ['jdoe']);
      expect(searchBody.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: 'now-10d', lte: 'now' } },
      });
    });

    it('composes range filter with queryRule filter', () => {
      const range = { start: 'now-14d', end: 'now' };
      const searchBody = buildIndexSourceSearchBody(
        'user.name',
        ['jdoe'],
        undefined,
        100,
        'event.action: "login"',
        range
      );
      const must = searchBody.query?.bool?.must as unknown[];
      // terms filter + range filter + KQL filter
      expect(must).toHaveLength(3);
      expect(must).toContainEqual({
        range: { '@timestamp': { gte: 'now-14d', lte: 'now' } },
      });
    });
  });

  describe('buildEntitiesSearchBody', () => {
    it('constructs the correct search body with default page size', () => {
      const searchBody = buildEntitiesSearchBody('user');
      expect(searchBody.size).toBe(0);
      expect(searchBody.aggs?.entities?.composite?.size).toBe(100);
      expect(searchBody.aggs?.entities?.composite?.sources).toEqual([
        { euid: { terms: { field: 'euid' } } },
      ]);
      expect(searchBody.runtime_mappings?.euid).toBeDefined();
      expect(searchBody.query?.bool?.must).toHaveLength(1);
    });

    it('constructs the correct search body with an afterKey for pagination', () => {
      const afterKey = { euid: 'user:jdoe' };
      const searchBody = buildEntitiesSearchBody('user', afterKey);
      expect(searchBody.aggs?.entities?.composite?.after).toEqual(afterKey);
    });

    it('constructs the correct search body with a custom page size', () => {
      const searchBody = buildEntitiesSearchBody('user', undefined, 50);
      expect(searchBody.aggs?.entities?.composite?.size).toBe(50);
    });

    it('constructs the correct search body with afterKey and custom page size', () => {
      const afterKey = { euid: 'user:user42' };
      const searchBody = buildEntitiesSearchBody('user', afterKey, 25);
      expect(searchBody.aggs?.entities?.composite?.after).toEqual(afterKey);
      expect(searchBody.aggs?.entities?.composite?.size).toBe(25);
    });

    it('constructs the correct search body for host entity type', () => {
      const searchBody = buildEntitiesSearchBody('host');
      expect(searchBody.aggs?.entities?.composite?.sources).toEqual([
        { euid: { terms: { field: 'euid' } } },
      ]);
      expect(searchBody.runtime_mappings?.euid).toBeDefined();
    });

    it('adds @timestamp range filter and latest_doc top_hits when syncMarker is set', () => {
      const syncMarker = '2024-01-15T00:00:00Z';
      const searchBody = buildEntitiesSearchBody('user', undefined, 100, syncMarker);

      expect(searchBody.query?.bool?.must).toHaveLength(2);
      expect(searchBody.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: syncMarker, lte: 'now' } },
      });

      const latestDocAgg = searchBody.aggs?.entities?.aggs?.latest_doc;
      expect(latestDocAgg).toBeDefined();
      expect(latestDocAgg?.top_hits?.size).toBe(1);
      expect(latestDocAgg?.top_hits?.sort).toEqual([{ '@timestamp': { order: 'desc' } }]);
      expect(latestDocAgg?.top_hits?._source).toContain('@timestamp');
      expect(latestDocAgg?.top_hits?._source).toContain('user.name');
      expect(latestDocAgg?.top_hits?._source).toContain('host.name');
    });

    it('does not add latest_doc agg when syncMarker is not set', () => {
      const searchBody = buildEntitiesSearchBody('user');
      expect(searchBody.aggs?.entities?.aggs).toBeUndefined();
      expect(searchBody.query?.bool?.must).toHaveLength(1);
    });

    it('adds an allowlist terms filter when allowed entity ids are provided', () => {
      const searchBody = buildEntitiesSearchBody('user', undefined, 100, undefined, ['user:jdoe']);

      expect(searchBody.query?.bool?.must).toHaveLength(2);
      expect(searchBody.query?.bool?.must).toContainEqual({
        terms: { euid: ['user:jdoe'] },
      });
    });

    it('composes allowlist terms filter with syncMarker filtering', () => {
      const syncMarker = '2024-01-15T00:00:00Z';
      const searchBody = buildEntitiesSearchBody('user', undefined, 100, syncMarker, ['user:jdoe']);

      expect(searchBody.query?.bool?.must).toHaveLength(3);
      expect(searchBody.query?.bool?.must).toContainEqual({
        terms: { euid: ['user:jdoe'] },
      });
      expect(searchBody.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: syncMarker, lte: 'now' } },
      });
    });

    it('applies queryRule as KQL filter', () => {
      const searchBody = buildEntitiesSearchBody(
        'user',
        undefined,
        100,
        undefined,
        undefined,
        'event.action: "login"'
      );
      const must = searchBody.query?.bool?.must as unknown[];
      expect(must).toHaveLength(2);
      expect(must[1]).toBeDefined();
    });

    it('does not add KQL filter when queryRule is undefined', () => {
      const searchBody = buildEntitiesSearchBody('user');
      expect(searchBody.query?.bool?.must).toHaveLength(1);
    });

    it('composes queryRule with syncMarker and allowedEntityIds', () => {
      const syncMarker = '2024-01-15T00:00:00Z';
      const searchBody = buildEntitiesSearchBody(
        'user',
        undefined,
        100,
        syncMarker,
        ['user:jdoe'],
        'user.roles: "admin"'
      );
      expect(searchBody.query?.bool?.must).toHaveLength(4);
      expect(searchBody.query?.bool?.must).toContainEqual({
        terms: { euid: ['user:jdoe'] },
      });
      expect(searchBody.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: syncMarker, lte: 'now' } },
      });
    });

    it('applies range filter when no syncMarker is set', () => {
      const range = { start: 'now-7d', end: 'now' };
      const searchBody = buildEntitiesSearchBody(
        'user',
        undefined,
        100,
        undefined,
        undefined,
        undefined,
        range
      );

      expect(searchBody.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: 'now-7d', lte: 'now' } },
      });
    });

    it('prefers syncMarker over range when both are provided', () => {
      const syncMarker = '2024-01-15T00:00:00Z';
      const range = { start: 'now-7d', end: 'now' };
      const searchBody = buildEntitiesSearchBody(
        'user',
        undefined,
        100,
        syncMarker,
        undefined,
        undefined,
        range
      );

      // syncMarker takes precedence
      expect(searchBody.query?.bool?.must).toContainEqual({
        range: { '@timestamp': { gte: syncMarker, lte: 'now' } },
      });
      // range filter should NOT be present separately
      expect(searchBody.query?.bool?.must).not.toContainEqual({
        range: { '@timestamp': { gte: 'now-7d', lte: 'now' } },
      });
    });

    it('does not add range filter when neither syncMarker nor range is set', () => {
      const searchBody = buildEntitiesSearchBody('user');
      expect(searchBody.query?.bool?.must).toHaveLength(1);
    });
  });
});
