/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveConversationIds,
  deriveThreadConversationId,
  type PndConversation,
} from '@kbn/pnd-common';

import { paginateConversations } from '.';

const AD_A = 'ad-a';
const AD_B = 'ad-b';
const AD_C = 'ad-c';

const idsA = deriveConversationIds(AD_A);
const idsB = deriveConversationIds(AD_B);
const idsC = deriveConversationIds(AD_C);

const threadId = (correlationId: string, gateId: string): string => {
  const id = deriveThreadConversationId({ correlationId, gateId });

  if (id == null) {
    throw new Error(`no thread id for ${gateId}`);
  }

  return id;
};

const conversation = ({
  correlationId,
  createdAt = '2026-08-02T00:00:00.000Z',
  gateId,
  id,
  kind,
  title,
  updatedAt,
}: {
  correlationId: string;
  createdAt?: string;
  gateId?: PndConversation['gateId'];
  id: string;
  kind: PndConversation['kind'];
  title?: string;
  updatedAt: string;
}): PndConversation => ({
  correlationId,
  createdAt,
  id,
  kind,
  title: title ?? `${kind} ${correlationId}`,
  updatedAt,
  ...(gateId == null ? {} : { gateId }),
});

const investigationA = conversation({
  correlationId: AD_A,
  id: idsA.investigationConversationId,
  kind: 'investigation',
  updatedAt: '2026-08-02T03:00:00.000Z',
});

const incidentA = conversation({
  correlationId: AD_A,
  id: idsA.incidentConversationId,
  kind: 'incident',
  updatedAt: '2026-08-02T04:00:00.000Z',
});

const tuningA = conversation({
  correlationId: AD_A,
  id: idsA.tuningConversationId,
  kind: 'tuning',
  updatedAt: '2026-08-02T05:00:00.000Z',
});

const openInvestigationThreadA = conversation({
  correlationId: AD_A,
  gateId: 'open_investigation',
  id: threadId(AD_A, 'open_investigation'),
  kind: 'thread',
  updatedAt: '2026-08-02T03:30:00.000Z',
});

const containThreadA = conversation({
  correlationId: AD_A,
  gateId: 'incident_contained',
  id: threadId(AD_A, 'incident_contained'),
  kind: 'thread',
  updatedAt: '2026-08-02T04:30:00.000Z',
});

const incidentB = conversation({
  correlationId: AD_B,
  id: idsB.incidentConversationId,
  kind: 'incident',
  updatedAt: '2026-08-02T02:00:00.000Z',
});

const incidentC = conversation({
  correlationId: AD_C,
  id: idsC.incidentConversationId,
  kind: 'incident',
  updatedAt: '2026-08-02T01:00:00.000Z',
});

const all: readonly PndConversation[] = [
  investigationA,
  incidentA,
  tuningA,
  openInvestigationThreadA,
  containThreadA,
  incidentB,
  incidentC,
];

describe('paginateConversations', () => {
  it('returns the full list when kind, page and perPage are omitted', () => {
    const result = paginateConversations({ conversations: all });

    expect(result.conversations).toHaveLength(all.length);
  });

  it('counts every conversation as total when unfiltered', () => {
    const result = paginateConversations({ conversations: all });

    expect(result.total).toBe(all.length);
  });

  it('filters to the requested kind', () => {
    const result = paginateConversations({ conversations: all, kind: 'incident' });

    expect(result.conversations.filter(({ kind }) => kind === 'incident')).toEqual([
      incidentA,
      incidentB,
      incidentC,
    ]);
  });

  it('counts only the requested kind in total', () => {
    const result = paginateConversations({ conversations: all, kind: 'incident' });

    expect(result.total).toBe(3);
  });

  it('sorts the requested kind by most recently updated first', () => {
    const result = paginateConversations({ conversations: all, kind: 'incident' });

    expect(
      result.conversations.filter(({ kind }) => kind === 'incident').map(({ id }) => id)
    ).toEqual([incidentA.id, incidentB.id, incidentC.id]);
  });

  it('slices the requested kind when page and perPage are set', () => {
    const result = paginateConversations({
      conversations: all,
      kind: 'incident',
      page: 2,
      perPage: 1,
    });

    expect(result.conversations.filter(({ kind }) => kind === 'incident')).toEqual([incidentB]);
  });

  it('keeps total as the unpaged kind count when slicing', () => {
    const result = paginateConversations({
      conversations: all,
      kind: 'incident',
      page: 2,
      perPage: 1,
    });

    expect(result.total).toBe(3);
  });

  it('nests incident-parented threads under an incident page', () => {
    const result = paginateConversations({ conversations: all, kind: 'incident' });

    expect(result.conversations.map(({ id }) => id)).toEqual(
      expect.arrayContaining([containThreadA.id])
    );
  });

  it('does not nest investigation-parented threads under an incident page', () => {
    const result = paginateConversations({ conversations: all, kind: 'incident' });

    expect(result.conversations.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining([openInvestigationThreadA.id])
    );
  });

  it('nests tuning under its incident, not as a top-level kind', () => {
    const result = paginateConversations({ conversations: all, kind: 'incident' });

    expect(result.conversations.map(({ id }) => id)).toEqual(expect.arrayContaining([tuningA.id]));
  });

  it('includes the originating investigation on an incident page so carry-over can traverse', () => {
    const result = paginateConversations({ conversations: all, kind: 'incident' });

    expect(result.conversations.map(({ id }) => id)).toEqual(
      expect.arrayContaining([investigationA.id])
    );
  });

  it('does not count nested children toward total', () => {
    const result = paginateConversations({
      conversations: all,
      kind: 'incident',
      page: 1,
      perPage: 1,
    });

    expect(result.total).toBe(3);
  });

  it('only includes children of the incidents on the current page', () => {
    const result = paginateConversations({
      conversations: all,
      kind: 'incident',
      page: 1,
      perPage: 1,
    });

    expect(result.conversations.filter(({ kind }) => kind === 'incident')).toEqual([incidentA]);
    expect(result.conversations.map(({ id }) => id)).toEqual(
      expect.arrayContaining([tuningA.id, containThreadA.id, investigationA.id])
    );
  });

  it('does not leak children of incidents on other pages', () => {
    const result = paginateConversations({
      conversations: all,
      kind: 'incident',
      page: 2,
      perPage: 1,
    });

    expect(result.conversations.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining([tuningA.id, containThreadA.id])
    );
  });

  it('nests investigation-parented threads under an investigation page', () => {
    const result = paginateConversations({ conversations: all, kind: 'investigation' });

    expect(result.conversations.map(({ id }) => id)).toEqual(
      expect.arrayContaining([openInvestigationThreadA.id])
    );
  });

  it('does not nest incident-parented threads under an investigation page', () => {
    const result = paginateConversations({ conversations: all, kind: 'investigation' });

    expect(result.conversations.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining([containThreadA.id])
    );
  });

  it('does not nest tuning under an investigation page', () => {
    const result = paginateConversations({ conversations: all, kind: 'investigation' });

    expect(result.conversations.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining([tuningA.id])
    );
  });

  it('does not nest incidents under an investigation page', () => {
    const result = paginateConversations({ conversations: all, kind: 'investigation' });

    expect(result.conversations.filter(({ kind }) => kind === 'incident')).toEqual([]);
  });

  it('does not append nested children when paging threads', () => {
    const result = paginateConversations({
      conversations: all,
      kind: 'thread',
      page: 1,
      perPage: 10,
    });

    expect(result.conversations.every(({ kind }) => kind === 'thread')).toBe(true);
  });

  it('returns an empty page past the last page', () => {
    const result = paginateConversations({
      conversations: all,
      kind: 'incident',
      page: 9,
      perPage: 1,
    });

    expect(result.conversations).toEqual([]);
  });

  it('does not mutate the input list', () => {
    const snapshot = [...all];

    paginateConversations({ conversations: all, kind: 'incident', page: 1, perPage: 1 });

    expect(all).toEqual(snapshot);
  });
});
