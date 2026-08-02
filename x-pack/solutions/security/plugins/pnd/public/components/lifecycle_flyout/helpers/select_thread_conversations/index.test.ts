/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';

import { selectThreadConversations } from '.';

const conversation = (overrides: Partial<PndConversation> = {}): PndConversation => ({
  correlationId: 'ad-1',
  createdAt: '2026-08-06T00:00:00.000Z',
  gateId: 'apply_tuning',
  id: 'thread-apply-tuning',
  kind: 'thread',
  title: 'Signed installers exception',
  updatedAt: '2026-08-06T00:00:00.000Z',
  ...overrides,
});

describe('selectThreadConversations', () => {
  it('returns the threads paired with this discovery proposals', () => {
    expect(
      selectThreadConversations({
        correlationId: 'ad-1',
        conversations: [conversation()],
      })
    ).toEqual([conversation()]);
  });

  it('returns every gate thread on the discovery, because a discovery has one per gate', () => {
    const openInvestigation = conversation({
      gateId: 'open_investigation',
      id: 'thread-open-investigation',
    });

    expect(
      selectThreadConversations({
        correlationId: 'ad-1',
        conversations: [conversation(), openInvestigation],
      })
    ).toEqual([conversation(), openInvestigation]);
  });

  it('keeps Agent Builder own ordering, so the list does not reshuffle between reads', () => {
    const openInvestigation = conversation({
      gateId: 'open_investigation',
      id: 'thread-open-investigation',
    });

    expect(
      selectThreadConversations({
        correlationId: 'ad-1',
        conversations: [openInvestigation, conversation()],
      }).map(({ id }) => id)
    ).toEqual(['thread-open-investigation', 'thread-apply-tuning']);
  });

  it('drops the three alert-keyed container conversations, which carry no attachments', () => {
    expect(
      selectThreadConversations({
        correlationId: 'ad-1',
        conversations: [conversation({ gateId: undefined, id: 'incident', kind: 'incident' })],
      })
    ).toEqual([]);
  });

  it('drops a thread belonging to another discovery', () => {
    expect(
      selectThreadConversations({
        correlationId: 'ad-1',
        conversations: [conversation({ correlationId: 'ad-2' })],
      })
    ).toEqual([]);
  });

  it('returns nothing for a blank discovery id, so an uncorrelated gate matches no thread', () => {
    expect(
      selectThreadConversations({
        correlationId: '',
        conversations: [conversation({ correlationId: '' })],
      })
    ).toEqual([]);
  });

  it('returns nothing when the space has no conversations at all', () => {
    expect(selectThreadConversations({ correlationId: 'ad-1', conversations: [] })).toEqual([]);
  });
});
