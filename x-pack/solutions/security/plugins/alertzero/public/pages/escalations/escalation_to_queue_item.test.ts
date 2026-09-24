/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escalationToQueueItem } from './escalation_to_queue_item';
import type { EscalationConversationSummary } from '@kbn/agentic-investigations-plugin/common';
import {
  ESCALATION_ASSIGNEES_FIELD,
  ESCALATION_LINKED_INVESTIGATIONS_FIELD,
  ESCALATION_STATUS_FIELD,
} from '@kbn/agentic-investigations-plugin/common';

/** Minimal fixture — only fields the adapter reads. */
const base = {
  id: 'esc-1',
  title: 'Login anomaly detected',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  metadata: {},
} as unknown as EscalationConversationSummary;

describe('escalationToQueueItem', () => {
  describe('passthrough fields', () => {
    it('copies id, title, createdAt, updatedAt verbatim', () => {
      const item = escalationToQueueItem(base);
      expect(item.id).toBe('esc-1');
      expect(item.title).toBe('Login anomaly detected');
      expect(item.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(item.updatedAt).toBe('2024-01-02T00:00:00Z');
    });
  });

  describe('status coercion', () => {
    it('defaults to "open" when metadata is absent', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: undefined,
      } as unknown as EscalationConversationSummary);
      expect(item.status).toBe('open');
    });

    it('defaults to "open" when the status field is absent from metadata', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: {},
      } as unknown as EscalationConversationSummary);
      expect(item.status).toBe('open');
    });

    it('sets status to "open" when metadata.status is "open"', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_STATUS_FIELD]: 'open' },
      } as unknown as EscalationConversationSummary);
      expect(item.status).toBe('open');
    });

    it('sets status to "closed" when metadata.status is "closed"', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_STATUS_FIELD]: 'closed' },
      } as unknown as EscalationConversationSummary);
      expect(item.status).toBe('closed');
    });

    it('defaults to "open" for any unrecognised status value', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_STATUS_FIELD]: 'unknown' },
      } as unknown as EscalationConversationSummary);
      expect(item.status).toBe('open');
    });
  });

  describe('linkedInvestigationCount', () => {
    it('is 0 when the field is absent from metadata', () => {
      const item = escalationToQueueItem(base);
      expect(item.linkedInvestigationCount).toBe(0);
    });

    it('is 0 when the field is not an array', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: 'not-an-array' },
      } as unknown as EscalationConversationSummary);
      expect(item.linkedInvestigationCount).toBe(0);
    });

    it('reflects the length of the linked investigations array', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: ['conv-1', 'conv-2', 'conv-3'] },
      } as unknown as EscalationConversationSummary);
      expect(item.linkedInvestigationCount).toBe(3);
    });

    it('is 0 for an empty array', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_LINKED_INVESTIGATIONS_FIELD]: [] },
      } as unknown as EscalationConversationSummary);
      expect(item.linkedInvestigationCount).toBe(0);
    });
  });

  describe('assigneeUids', () => {
    it('is an empty array when the field is absent from metadata', () => {
      const item = escalationToQueueItem(base);
      expect(item.assigneeUids).toEqual([]);
    });

    it('is an empty array when the field is not an array', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_ASSIGNEES_FIELD]: 'not-an-array' },
      } as unknown as EscalationConversationSummary);
      expect(item.assigneeUids).toEqual([]);
    });

    it('reflects the assignee uid array', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_ASSIGNEES_FIELD]: ['uid-1', 'uid-2'] },
      } as unknown as EscalationConversationSummary);
      expect(item.assigneeUids).toEqual(['uid-1', 'uid-2']);
    });

    it('is an empty array for an empty assignees list', () => {
      const item = escalationToQueueItem({
        ...base,
        metadata: { [ESCALATION_ASSIGNEES_FIELD]: [] },
      } as unknown as EscalationConversationSummary);
      expect(item.assigneeUids).toEqual([]);
    });
  });
});
