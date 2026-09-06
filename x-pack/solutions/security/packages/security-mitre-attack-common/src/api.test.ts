/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetMitreEntitiesRequestQuery } from './api';

describe('GetMitreEntitiesRequestQuery', () => {
  describe('defaults', () => {
    it('applies framework=enterprise and status=active when query is empty', () => {
      const result = GetMitreEntitiesRequestQuery.parse({});
      expect(result.framework).toBe('enterprise');
      expect(result.status).toBe('active');
      expect(result.framework_version).toBeUndefined();
      expect(result.types).toBeUndefined();
    });
  });

  describe('types coercion', () => {
    it('coerces a single type string to a 1-element array', () => {
      const result = GetMitreEntitiesRequestQuery.parse({ types: 'technique' });
      expect(result.types).toEqual(['technique']);
    });

    it('coerces a comma-separated string to an array', () => {
      const result = GetMitreEntitiesRequestQuery.parse({ types: 'tactic,technique' });
      expect(result.types).toEqual(['tactic', 'technique']);
    });

    it('accepts an already-parsed array of valid types', () => {
      const result = GetMitreEntitiesRequestQuery.parse({
        types: ['tactic', 'technique', 'subtechnique'],
      });
      expect(result.types).toEqual(['tactic', 'technique', 'subtechnique']);
    });

    it('rejects more than 3 types elements', () => {
      expect(() =>
        GetMitreEntitiesRequestQuery.parse({
          types: ['tactic', 'technique', 'subtechnique', 'tactic'],
        })
      ).toThrow();
    });

    it('rejects an empty types string (empty array after coercion)', () => {
      expect(() => GetMitreEntitiesRequestQuery.parse({ types: '' })).toThrow();
    });
  });

  describe('framework validation', () => {
    it('accepts enterprise framework', () => {
      const result = GetMitreEntitiesRequestQuery.parse({ framework: 'enterprise' });
      expect(result.framework).toBe('enterprise');
    });

    it('rejects an unknown framework value', () => {
      expect(() => GetMitreEntitiesRequestQuery.parse({ framework: 'ics' })).toThrow();
    });
  });

  describe('framework_version validation', () => {
    it('accepts a version string within 32 characters', () => {
      const result = GetMitreEntitiesRequestQuery.parse({ framework_version: '15.1' });
      expect(result.framework_version).toBe('15.1');
    });

    it('rejects a framework_version longer than 32 characters', () => {
      expect(() =>
        GetMitreEntitiesRequestQuery.parse({ framework_version: 'a'.repeat(33) })
      ).toThrow();
    });

    it('rejects an empty framework_version string', () => {
      expect(() => GetMitreEntitiesRequestQuery.parse({ framework_version: '' })).toThrow();
    });

    it('accepts exactly 32-character framework_version', () => {
      const result = GetMitreEntitiesRequestQuery.parse({ framework_version: 'a'.repeat(32) });
      expect(result.framework_version).toBe('a'.repeat(32));
    });
  });

  describe('status validation', () => {
    it('accepts active status', () => {
      const result = GetMitreEntitiesRequestQuery.parse({ status: 'active' });
      expect(result.status).toBe('active');
    });

    it('accepts all status', () => {
      const result = GetMitreEntitiesRequestQuery.parse({ status: 'all' });
      expect(result.status).toBe('all');
    });

    it('rejects an invalid status value', () => {
      expect(() => GetMitreEntitiesRequestQuery.parse({ status: 'deprecated' })).toThrow();
    });
  });
});
