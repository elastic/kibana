/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  observationSchema,
  leadSchema,
  leadEntitySchema,
  generateLeadsRequestSchema,
  findLeadsRequestSchema,
} from './types';

describe('Lead generation Zod schemas', () => {
  describe('observationSchema', () => {
    const valid = {
      entityId: 'user:alice',
      moduleId: 'risk_score',
      type: 'high_risk_score',
      score: 85,
      severity: 'critical',
      confidence: 0.95,
      description: 'Risk score exceeds threshold',
      metadata: { riskScore: 85 },
    };

    it('accepts a valid observation', () => {
      expect(() => observationSchema.parse(valid)).not.toThrow();
    });

    it('rejects score outside 0–100', () => {
      expect(() => observationSchema.parse({ ...valid, score: 150 })).toThrow();
      expect(() => observationSchema.parse({ ...valid, score: -1 })).toThrow();
    });

    it('rejects confidence outside 0–1', () => {
      expect(() => observationSchema.parse({ ...valid, confidence: 1.5 })).toThrow();
    });

    it('rejects invalid severity', () => {
      expect(() => observationSchema.parse({ ...valid, severity: 'extreme' })).toThrow();
    });
  });

  describe('leadEntitySchema', () => {
    it('accepts a valid entity reference', () => {
      expect(() => leadEntitySchema.parse({ type: 'user', name: 'alice' })).not.toThrow();
    });

    it('rejects missing name', () => {
      expect(() => leadEntitySchema.parse({ type: 'user' })).toThrow();
    });
  });

  describe('leadSchema', () => {
    const valid = {
      id: 'lead-001',
      title: 'Suspicious lateral movement',
      byline: 'User alice with risk score 90',
      description: 'Detailed investigation guide here',
      entities: [{ type: 'user', name: 'alice' }],
      tags: ['lateral_movement'],
      priority: 8,
      chatRecommendations: ['Investigate recent logins'],
      timestamp: '2026-02-17T10:00:00.000Z',
      staleness: 'fresh',
      status: 'active',
      observations: [
        {
          entityId: 'user:alice',
          moduleId: 'risk_score',
          type: 'high_risk_score',
          score: 90,
          severity: 'critical',
          confidence: 0.95,
          description: 'Risk score 90',
          metadata: {},
        },
      ],
      executionUuid: '550e8400-e29b-41d4-a716-446655440000',
      sourceType: 'adhoc',
    };

    it('accepts a valid lead', () => {
      expect(() => leadSchema.parse(valid)).not.toThrow();
    });

    it('rejects priority outside 1–10', () => {
      expect(() => leadSchema.parse({ ...valid, priority: 0 })).toThrow();
      expect(() => leadSchema.parse({ ...valid, priority: 11 })).toThrow();
    });

    it('rejects invalid staleness', () => {
      expect(() => leadSchema.parse({ ...valid, staleness: 'unknown' })).toThrow();
    });

    it('defaults status to active when omitted', () => {
      const { status: _, ...withoutStatus } = valid;
      expect(leadSchema.parse(withoutStatus).status).toBe('active');
    });
  });

  describe('generateLeadsRequestSchema', () => {
    it('accepts an empty body', () => {
      expect(() => generateLeadsRequestSchema.parse({})).not.toThrow();
    });

    it('rejects maxLeads above 50', () => {
      expect(() => generateLeadsRequestSchema.parse({ maxLeads: 51 })).toThrow();
    });
  });

  describe('findLeadsRequestSchema', () => {
    it('applies defaults for all optional fields', () => {
      const parsed = findLeadsRequestSchema.parse({});
      expect(parsed).toEqual(
        expect.objectContaining({ page: 1, perPage: 20, sortField: 'priority', sortOrder: 'desc' })
      );
    });

    it('rejects invalid sortField', () => {
      expect(() => findLeadsRequestSchema.parse({ sortField: 'name' })).toThrow();
    });
  });
});
