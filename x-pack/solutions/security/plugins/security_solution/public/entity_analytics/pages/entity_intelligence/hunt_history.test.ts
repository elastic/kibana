/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHuntRequestSchema } from '../../../../common/entity_analytics/ai_hunt_history/types';
import type { HuntListItem } from '../../../../common/entity_analytics/ai_hunt_history/types';
import type { HuntArtifact } from './hunt_artifacts';
import {
  buildCreateHuntRequest,
  buildHuntSummary,
  formatRelativeTime,
  huntDisplayLabel,
  sortHuntListItems,
  toPersistedStatus,
  fromPersistedStatus,
} from './hunt_history';

const listItem = (overrides: Partial<HuntListItem>): HuntListItem => ({
  id: overrides.id ?? 'id',
  question: overrides.question ?? 'A question',
  scopedPrompt: overrides.scopedPrompt,
  createdAt: overrides.createdAt ?? '2026-07-17T10:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-07-17T10:00:00.000Z',
  createdBy: overrides.createdBy ?? 'analyst',
  name: overrides.name,
  pinned: overrides.pinned ?? false,
  status: overrides.status ?? 'complete',
  summary: overrides.summary ?? {
    verdict: '',
    findingCount: 0,
    entityCount: 0,
    alertCount: 0,
  },
});

describe('hunt_history helpers', () => {
  describe('toPersistedStatus', () => {
    it('maps failed to error', () => {
      expect(toPersistedStatus('failed')).toBe('error');
    });
    it('maps running through', () => {
      expect(toPersistedStatus('running')).toBe('running');
    });
    it('preserves partial results separately from completed hunts', () => {
      expect(toPersistedStatus('partial')).toBe('partial');
      expect(toPersistedStatus('completed')).toBe('complete');
    });
  });

  it('reopens stopped or interrupted saved hunts as incomplete', () => {
    expect(fromPersistedStatus(toPersistedStatus('partial'))).toBe('partial');
    expect(fromPersistedStatus('running')).toBe('partial');
    expect(fromPersistedStatus('complete')).toBe('completed');
    expect(fromPersistedStatus('error')).toBe('failed');
  });

  describe('buildHuntSummary', () => {
    it('projects verdict and counts from a structured verdict artifact', () => {
      const artifacts: HuntArtifact[] = [
        {
          id: 'v',
          type: 'verdict',
          summary: 'Two accounts were reactivated.',
          title: 'Dormant accounts',
          severity: 'high',
          confidence: 82,
          takeaways: [],
        },
        {
          id: 'a1',
          type: 'alert',
          title: 'Suspicious login',
          severity: 'high',
          entities: ['alice'],
        },
      ];

      const summary = buildHuntSummary({ question: 'dormant account reactivation', artifacts });

      expect(summary.verdict).toBe('Two accounts were reactivated.');
      expect(summary.severity).toBe('high');
      expect(summary.confidence).toBe(82);
      expect(summary.alertCount).toBe(1);
      expect(summary.findingCount).toBeGreaterThanOrEqual(1);
    });

    it('falls back to an empty-but-defined summary when there are no artifacts', () => {
      const summary = buildHuntSummary({ question: 'anything', artifacts: [] });
      expect(summary.findingCount).toBe(0);
      expect(summary.entityCount).toBe(0);
      expect(summary.alertCount).toBe(0);
      expect(typeof summary.verdict).toBe('string');
    });
  });

  describe('buildCreateHuntRequest', () => {
    it('accepts incomplete evidence through the persistence request schema', () => {
      const request = buildCreateHuntRequest({
        question: 'Investigate interrupted hunt',
        content: 'Partial evidence',
        artifacts: [],
        activities: [],
        status: 'partial',
      });
      expect(createHuntRequestSchema.parse(request).status).toBe('partial');
    });

    it('captures question, scoped prompt, status, and the full result payload', () => {
      const artifacts: HuntArtifact[] = [
        { id: 'a1', type: 'alert', title: 'Alert', severity: 'low', entities: [] },
      ];
      const request = buildCreateHuntRequest({
        question: 'Find lateral movement',
        scopedPrompt: 'SCOPED: find lateral movement',
        content: 'The narrative.',
        artifacts,
        activities: [{ id: 't1', toolId: 'execute_esql', status: 'complete' }],
        status: 'completed',
      });

      expect(request.question).toBe('Find lateral movement');
      expect(request.scopedPrompt).toBe('SCOPED: find lateral movement');
      expect(request.status).toBe('complete');
      expect(request.result.content).toBe('The narrative.');
      expect(request.result.artifacts).toHaveLength(1);
      expect(request.result.activities).toHaveLength(1);
      expect(request.summary.alertCount).toBe(1);
    });
  });

  describe('sortHuntListItems', () => {
    it('orders pinned first then by most recent update', () => {
      const items = [
        listItem({ id: 'old', updatedAt: '2026-07-10T10:00:00.000Z' }),
        listItem({ id: 'pinned-old', pinned: true, updatedAt: '2026-07-01T10:00:00.000Z' }),
        listItem({ id: 'recent', updatedAt: '2026-07-16T10:00:00.000Z' }),
        listItem({ id: 'pinned-recent', pinned: true, updatedAt: '2026-07-15T10:00:00.000Z' }),
      ];

      const sorted = sortHuntListItems(items).map(({ id }) => id);

      expect(sorted).toEqual(['pinned-recent', 'pinned-old', 'recent', 'old']);
    });

    it('does not mutate the input array', () => {
      const items = [listItem({ id: 'a' }), listItem({ id: 'b' })];
      const before = items.map(({ id }) => id);
      sortHuntListItems(items);
      expect(items.map(({ id }) => id)).toEqual(before);
    });
  });

  describe('huntDisplayLabel', () => {
    it('prefers a trimmed analyst name', () => {
      expect(huntDisplayLabel({ name: '  My hunt  ', question: 'Question here' })).toBe('My hunt');
    });
    it('falls back to the first sentence of the question', () => {
      expect(huntDisplayLabel({ question: 'Find lateral movement. Then more.' })).toBe(
        'Find lateral movement'
      );
    });
    it('truncates very long questions', () => {
      const long = `${'x'.repeat(200)}`;
      const label = huntDisplayLabel({ question: long });
      expect(label.endsWith('…')).toBe(true);
      expect(label.length).toBeLessThanOrEqual(80);
    });
  });

  describe('formatRelativeTime', () => {
    const now = Date.parse('2026-07-17T12:00:00.000Z');
    it('returns "just now" for sub-minute deltas', () => {
      expect(formatRelativeTime('2026-07-17T11:59:30.000Z', now)).toBe('just now');
    });
    it('formats hours ago', () => {
      expect(formatRelativeTime('2026-07-17T09:00:00.000Z', now)).toContain('3');
    });
    it('returns the raw string for an invalid timestamp', () => {
      expect(formatRelativeTime('not-a-date', now)).toBe('not-a-date');
    });
  });
});
