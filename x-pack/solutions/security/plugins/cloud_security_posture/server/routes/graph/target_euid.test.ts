/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '@kbn/entity-store/common';
import { getTargetEuidEsqlEvaluation, getTargetEuidSourceFields } from './target_euid';

describe('getTargetEuidEsqlEvaluation', () => {
  describe('user type', () => {
    it('generates ESQL referencing target-namespace fields', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.user);

      expect(esql).toContain('user.target.email');
      expect(esql).toContain('user.target.id');
      expect(esql).toContain('user.target.name');
      expect(esql).toContain('user.target.domain');
      expect(esql).toContain('host.target.id');
    });

    it('prepends the entity type by default', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.user);

      expect(esql).toContain('CONCAT("user:"');
    });

    it('preserves entity.namespace references (computed field, not transformed)', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.user);

      expect(esql).toContain('entity.namespace');
      // entity.namespace should NOT be transformed to entity.target.namespace
      expect(esql).not.toContain('entity.target.namespace');
    });

    it('does not reference actor-namespace user fields', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.user);

      // Check that un-namespaced actor fields are not present by verifying
      // the specific patterns. We need to be careful because "user.target.email"
      // contains the substring "user." which we want, but "user.email" without
      // ".target." should not appear.
      const withoutTargetRefs = esql.replace(/user\.target\./g, 'USER_TARGET_REPLACED.');
      expect(withoutTargetRefs).not.toContain('user.email');
      expect(withoutTargetRefs).not.toContain('user.id');
      expect(withoutTargetRefs).not.toContain('user.name');
      expect(withoutTargetRefs).not.toContain('user.domain');
    });
  });

  describe('host type', () => {
    it('generates ESQL referencing target-namespace fields', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.host);

      expect(esql).toContain('host.target.id');
      expect(esql).toContain('host.target.name');
      expect(esql).toContain('host.target.hostname');
    });

    it('prepends the entity type', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.host);

      expect(esql).toContain('CONCAT("host:"');
    });
  });

  describe('service type', () => {
    it('generates ESQL referencing service.target.name', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.service);

      expect(esql).toContain('service.target.name');
    });

    it('prepends the entity type', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.service);

      expect(esql).toContain('CONCAT("service:"');
    });
  });

  describe('generic type', () => {
    it('generates ESQL referencing entity.target.id', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.generic);

      expect(esql).toContain('entity.target.id');
    });

    it('does not prepend entity type (skipTypePrepend)', () => {
      const esql = getTargetEuidEsqlEvaluation(EntityType.enum.generic);

      expect(esql).not.toContain('CONCAT("generic:"');
    });
  });
});

describe('getTargetEuidSourceFields', () => {
  it('returns target-namespace fields for host', () => {
    const fields = getTargetEuidSourceFields(EntityType.enum.host);

    expect(fields).toContain('host.target.id');
    expect(fields).toContain('host.target.name');
    expect(fields).toContain('host.target.hostname');
    expect(fields).not.toContain('host.id');
    expect(fields).not.toContain('host.name');
    expect(fields).not.toContain('host.hostname');
  });

  it('returns target-namespace fields for user', () => {
    const fields = getTargetEuidSourceFields(EntityType.enum.user);

    expect(fields).toContain('user.target.email');
    expect(fields).toContain('user.target.id');
    expect(fields).toContain('user.target.name');
    expect(fields).toContain('user.target.domain');
    expect(fields).toContain('host.target.id');
    expect(fields).not.toContain('user.email');
    expect(fields).not.toContain('user.id');
    expect(fields).not.toContain('user.name');
  });

  it('returns target-namespace singleField for service', () => {
    const fields = getTargetEuidSourceFields(EntityType.enum.service);

    expect(fields).toEqual(['service.target.name']);
  });

  it('returns target-namespace singleField for generic', () => {
    const fields = getTargetEuidSourceFields(EntityType.enum.generic);

    expect(fields).toEqual(['entity.target.id']);
  });

  it('returns deduplicated fields', () => {
    const fields = getTargetEuidSourceFields(EntityType.enum.user);
    const unique = new Set(fields);

    expect(fields).toHaveLength(unique.size);
  });
});
