/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';
import {
  mockConversations,
  mockConversationsWithThreads,
  mockThreadConversations,
} from '../../mock/conversations';
import { ALL_CONVERSATION_KINDS, filterConversations } from '.';

const defaultParams = {
  conversations: mockConversations,
  kind: ALL_CONVERSATION_KINDS,
  query: '',
};

const idsOf = (conversations: PndConversation[]): string[] =>
  conversations.map((conversation) => conversation.id);

describe('filterConversations', () => {
  it('returns every conversation when nothing is filtered', () => {
    expect(filterConversations(defaultParams)).toEqual(mockConversations);
  });

  it('keeps only the selected kind', () => {
    const filtered = filterConversations({ ...defaultParams, kind: 'incident' });

    expect(idsOf(filtered)).toEqual(['3f2504e0-4f89-11d3-9a0c-0305e82c3302']);
  });

  it('keeps the tuning kind, which Phase 4 adds', () => {
    const filtered = filterConversations({ ...defaultParams, kind: 'tuning' });

    expect(idsOf(filtered)).toEqual(['3f2504e0-4f89-11d3-9a0c-0305e82c3303']);
  });

  it('keeps only the threads, which are keyed on a gate rather than on a phase', () => {
    const filtered = filterConversations({
      ...defaultParams,
      conversations: mockConversationsWithThreads,
      kind: 'thread',
    });

    expect(idsOf(filtered)).toEqual(idsOf(mockThreadConversations));
  });

  it('keeps a thread out of the three alert-keyed kinds it is not', () => {
    const filtered = filterConversations({
      ...defaultParams,
      conversations: mockThreadConversations,
      kind: 'tuning',
    });

    expect(filtered).toEqual([]);
  });

  it('keeps every thread when the kind filter is off', () => {
    const filtered = filterConversations({
      ...defaultParams,
      conversations: mockConversationsWithThreads,
    });

    expect(filtered).toEqual(mockConversationsWithThreads);
  });

  it('matches a thread by the gate-derived conversation id a server log hands over', () => {
    const filtered = filterConversations({
      ...defaultParams,
      conversations: mockConversationsWithThreads,
      query: mockThreadConversations[0].id,
    });

    expect(idsOf(filtered)).toEqual([mockThreadConversations[0].id]);
  });

  it('matches the title', () => {
    const filtered = filterConversations({ ...defaultParams, query: 'credential dumping' });

    expect(idsOf(filtered)).toEqual(['3f2504e0-4f89-11d3-9a0c-0305e82c3302']);
  });

  it('matches the title case-insensitively', () => {
    // both conversations derived from ad-alert-1 carry the attack's name in their title
    const filtered = filterConversations({ ...defaultParams, query: 'POWERSHELL' });

    expect(idsOf(filtered)).toEqual([
      '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      '3f2504e0-4f89-11d3-9a0c-0305e82c3303',
    ]);
  });

  it('matches the attack discovery alert id, so all of one attack can be pulled up at once', () => {
    const filtered = filterConversations({ ...defaultParams, query: 'ad-alert-1' });

    expect(idsOf(filtered)).toEqual([
      '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
      '3f2504e0-4f89-11d3-9a0c-0305e82c3303',
    ]);
  });

  it('matches the conversation id, which is what a server log gives an analyst to paste', () => {
    const filtered = filterConversations({
      ...defaultParams,
      query: '3f2504e0-4f89-11d3-9a0c-0305e82c3303',
    });

    expect(idsOf(filtered)).toEqual(['3f2504e0-4f89-11d3-9a0c-0305e82c3303']);
  });

  it('ignores surrounding whitespace in the query', () => {
    const filtered = filterConversations({ ...defaultParams, query: '   credential   ' });

    expect(idsOf(filtered)).toEqual(['3f2504e0-4f89-11d3-9a0c-0305e82c3302']);
  });

  it('treats a whitespace-only query as no query at all', () => {
    expect(filterConversations({ ...defaultParams, query: '   ' })).toEqual(mockConversations);
  });

  it('applies the kind and the query together', () => {
    const filtered = filterConversations({
      ...defaultParams,
      kind: 'investigation',
      query: 'ad-alert-1',
    });

    expect(idsOf(filtered)).toEqual(['3f2504e0-4f89-11d3-9a0c-0305e82c3301']);
  });

  it('returns nothing when the query matches nothing', () => {
    expect(filterConversations({ ...defaultParams, query: 'no such attack' })).toEqual([]);
  });

  it('does not mutate the conversations it was given', () => {
    filterConversations({ ...defaultParams, kind: 'incident' });

    expect(mockConversations).toHaveLength(3);
  });

  it('keeps a conversation whose kind the browser does not know when the kind filter is off', () => {
    const unknown = {
      ...mockConversations[0],
      id: 'unknown-kind',
      kind: 'containment' as PndConversation['kind'],
    };

    const filtered = filterConversations({ ...defaultParams, conversations: [unknown] });

    expect(idsOf(filtered)).toEqual(['unknown-kind']);
  });
});
