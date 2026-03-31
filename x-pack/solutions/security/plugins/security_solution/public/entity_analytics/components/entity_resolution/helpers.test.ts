/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEntityField,
  getEntityName,
  getEntityId,
  getEntitySource,
  getEntityRiskScore,
  getResolutionRiskScore,
} from './helpers';

describe('helpers', () => {
  describe('getEntityField', () => {
    it('returns value from flat-keyed entity', () => {
      const entity = { 'entity.name': 'alice' };
      expect(getEntityField(entity, 'entity.name')).toBe('alice');
    });

    it('walks nested path when flat key is missing', () => {
      const entity = { entity: { name: 'bob' } };
      expect(getEntityField(entity, 'entity.name')).toBe('bob');
    });

    it('returns undefined for missing field', () => {
      expect(getEntityField({}, 'entity.name')).toBeUndefined();
    });

    it('returns undefined when intermediate path is null', () => {
      const entity = { entity: null };
      expect(getEntityField(entity, 'entity.name')).toBeUndefined();
    });
  });

  describe('getEntityName', () => {
    it('returns entity name', () => {
      expect(getEntityName({ 'entity.name': 'alice' })).toBe('alice');
    });

    it('returns empty string when missing', () => {
      expect(getEntityName({})).toBe('');
    });
  });

  describe('getEntityId', () => {
    it('returns entity id', () => {
      expect(getEntityId({ 'entity.id': 'id-123' })).toBe('id-123');
    });

    it('returns empty string when missing', () => {
      expect(getEntityId({})).toBe('');
    });
  });

  describe('getEntitySource', () => {
    it('returns entity source', () => {
      expect(getEntitySource({ 'entity.source': 'logs-okta' })).toBe('logs-okta');
    });

    it('returns empty string when missing', () => {
      expect(getEntitySource({})).toBe('');
    });
  });

  describe('getEntityRiskScore', () => {
    it('returns score when present as number', () => {
      expect(getEntityRiskScore({ 'entity.risk.calculated_score_norm': 75.5 })).toBe(75.5);
    });

    it('returns undefined when missing', () => {
      expect(getEntityRiskScore({})).toBeUndefined();
    });

    it('returns undefined when value is not a number', () => {
      expect(getEntityRiskScore({ 'entity.risk.calculated_score_norm': 'high' })).toBeUndefined();
    });
  });

  describe('getResolutionRiskScore', () => {
    it('returns resolution risk score when present', () => {
      expect(
        getResolutionRiskScore({
          'entity.relationships.resolution.risk.calculated_score_norm': 85,
        })
      ).toBe(85);
    });

    it('returns undefined when missing', () => {
      expect(getResolutionRiskScore({})).toBeUndefined();
    });
  });
});
