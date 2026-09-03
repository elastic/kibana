/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';
import { mockConversations, mockConversationsWithThreads } from '../../mock/conversations';
import { PND_CONVERSATION_SORTS, sortConversations } from '.';

const titlesOf = (conversations: PndConversation[]): string[] =>
  conversations.map((conversation) => conversation.title);

/**
 * Identifies a row by kind **and** title, because two of the fixture's conversations come from one
 * Attack Discovery and therefore carry the same title now that the kind prefixes are gone
 * (kibana-phf4.16). A titles-only assertion would keep passing if the sort swapped those two.
 */
const identifyAll = (conversations: PndConversation[]): string[] =>
  conversations.map(({ kind, title }) => `${kind}: ${title}`);

describe('sortConversations', () => {
  it('offers exactly the three sorts the projection can support', () => {
    expect(PND_CONVERSATION_SORTS).toEqual(['updatedAt', 'createdAt', 'title']);
  });

  it('sorts by most recently updated first', () => {
    const sorted = sortConversations({ conversations: mockConversations, sort: 'updatedAt' });

    expect(identifyAll(sorted)).toEqual([
      'tuning: Suspicious PowerShell on host-1',
      'incident: Credential dumping on host-2',
      'investigation: Suspicious PowerShell on host-1',
    ]);
  });

  it('sorts by most recently created first', () => {
    const sorted = sortConversations({ conversations: mockConversations, sort: 'createdAt' });

    expect(identifyAll(sorted)).toEqual([
      'tuning: Suspicious PowerShell on host-1',
      'incident: Credential dumping on host-2',
      'investigation: Suspicious PowerShell on host-1',
    ]);
  });

  it('interleaves threads with the alert-keyed conversations rather than grouping by kind', () => {
    const sorted = sortConversations({
      conversations: mockConversationsWithThreads,
      sort: 'updatedAt',
    });

    expect(identifyAll(sorted)).toEqual([
      'tuning: Suspicious PowerShell on host-1',
      'thread: Should the rule ignore signed installers?',
      'thread: Has the staging directory stopped being written to?',
      'incident: Credential dumping on host-2',
      'thread: Does host-1 belong to the same intrusion as host-2?',
      'investigation: Suspicious PowerShell on host-1',
      'thread: Is this worth a full investigation?',
    ]);
  });

  it('sorts by title ascending', () => {
    const sorted = sortConversations({ conversations: mockConversations, sort: 'title' });

    expect(titlesOf(sorted)).toEqual([
      'Credential dumping on host-2',
      'Suspicious PowerShell on host-1',
      'Suspicious PowerShell on host-1',
    ]);
  });

  // Two conversations from one Attack Discovery now share a title, so the title sort cannot group
  // by kind any more (kibana-phf4.16). It must at least be stable, or the list would reshuffle
  // those two rows on every render for no reason a reader could see.
  it('keeps rows that share one Attack Discovery title in their original order', () => {
    const sorted = sortConversations({ conversations: mockConversations, sort: 'title' });

    expect(identifyAll(sorted)).toEqual([
      'incident: Credential dumping on host-2',
      'investigation: Suspicious PowerShell on host-1',
      'tuning: Suspicious PowerShell on host-1',
    ]);
  });

  it('compares titles case-insensitively, so casing does not split the list', () => {
    const conversations: PndConversation[] = [
      { ...mockConversations[0], title: 'beta' },
      { ...mockConversations[1], title: 'Alpha' },
    ];

    expect(titlesOf(sortConversations({ conversations, sort: 'title' }))).toEqual([
      'Alpha',
      'beta',
    ]);
  });

  it('does not mutate the array it was given', () => {
    const conversations = [...mockConversations];

    sortConversations({ conversations, sort: 'title' });

    expect(conversations).toEqual(mockConversations);
  });

  it('sorts an unparseable timestamp last rather than dropping the row', () => {
    const conversations: PndConversation[] = [
      { ...mockConversations[0], title: 'broken', updatedAt: 'not a date' },
      { ...mockConversations[1], title: 'good' },
    ];

    expect(titlesOf(sortConversations({ conversations, sort: 'updatedAt' }))).toEqual([
      'good',
      'broken',
    ]);
  });

  it('returns an empty array unchanged', () => {
    expect(sortConversations({ conversations: [], sort: 'updatedAt' })).toEqual([]);
  });
});
