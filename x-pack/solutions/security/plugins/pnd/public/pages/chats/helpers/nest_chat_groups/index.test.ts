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

import { nestChatGroups } from '.';

const AD = 'ad-nested';
const ids = deriveConversationIds(AD);

const threadId = (gateId: string): string => {
  const id = deriveThreadConversationId({ correlationId: AD, gateId });

  if (id == null) {
    throw new Error(`no thread id for ${gateId}`);
  }

  return id;
};

const conversation = ({
  gateId,
  id,
  kind,
  title,
}: {
  gateId?: PndConversation['gateId'];
  id: string;
  kind: PndConversation['kind'];
  title: string;
}): PndConversation => ({
  correlationId: AD,
  createdAt: '2026-08-02T00:00:00.000Z',
  id,
  kind,
  title,
  updatedAt: '2026-08-02T01:00:00.000Z',
  ...(gateId == null ? {} : { gateId }),
});

const investigation = conversation({
  id: ids.investigationConversationId,
  kind: 'investigation',
  title: 'Investigation',
});

const incident = conversation({
  id: ids.incidentConversationId,
  kind: 'incident',
  title: 'Incident',
});

const tuning = conversation({
  id: ids.tuningConversationId,
  kind: 'tuning',
  title: 'Tuning',
});

const openInvestigationThread = conversation({
  gateId: 'open_investigation',
  id: threadId('open_investigation'),
  kind: 'thread',
  title: 'Open an investigation?',
});

const containThread = conversation({
  gateId: 'incident_contained',
  id: threadId('incident_contained'),
  kind: 'thread',
  title: 'Confirm containment?',
});

const orphanThread: PndConversation = {
  correlationId: 'ad-orphan',
  createdAt: '2026-08-02T00:00:00.000Z',
  gateId: 'open_investigation',
  id: 'orphan-thread',
  kind: 'thread',
  title: 'Orphan',
  updatedAt: '2026-08-02T01:00:00.000Z',
};

const all = [investigation, incident, tuning, openInvestigationThread, containThread, orphanThread];

describe('nestChatGroups', () => {
  it('uses incidents as group headers', () => {
    const groups = nestChatGroups({ conversations: all, kind: 'incident' });

    expect(groups.map(({ parent }) => parent.id)).toEqual([incident.id]);
  });

  it('nests an incident-parented thread under its incident', () => {
    const [group] = nestChatGroups({ conversations: all, kind: 'incident' });

    expect(group.children.map(({ id }) => id)).toEqual(expect.arrayContaining([containThread.id]));
  });

  it('nests tuning under its incident', () => {
    const [group] = nestChatGroups({ conversations: all, kind: 'incident' });

    expect(group.children.map(({ id }) => id)).toEqual(expect.arrayContaining([tuning.id]));
  });

  it('shows the originating investigation by traversing promotedFrom, never by copying', () => {
    const [group] = nestChatGroups({ conversations: all, kind: 'incident' });

    expect(group.children.map(({ id }) => id)).toEqual(expect.arrayContaining([investigation.id]));
  });

  it('does not hang the incident under the investigation', () => {
    const groups = nestChatGroups({ conversations: all, kind: 'investigation' });

    expect(groups[0].children.map(({ id }) => id)).not.toEqual(
      expect.arrayContaining([incident.id])
    );
  });

  it('nests an investigation-parented thread under its investigation', () => {
    const [group] = nestChatGroups({ conversations: all, kind: 'investigation' });

    expect(group.children.map(({ id }) => id)).toEqual(
      expect.arrayContaining([openInvestigationThread.id])
    );
  });

  it('does not nest tuning under an investigation', () => {
    const [group] = nestChatGroups({ conversations: all, kind: 'investigation' });

    expect(group.children.map(({ id }) => id)).not.toEqual(expect.arrayContaining([tuning.id]));
  });

  it('renders orphan threads nowhere — not as a group and not as a child', () => {
    const incidents = nestChatGroups({ conversations: all, kind: 'incident' });
    const investigations = nestChatGroups({ conversations: all, kind: 'investigation' });

    expect(
      [...incidents, ...investigations].flatMap(({ children, parent }) => [
        parent.id,
        ...children.map(({ id }) => id),
      ])
    ).not.toEqual(expect.arrayContaining([orphanThread.id]));
  });

  it('does not create a top-level tuning group', () => {
    const incidents = nestChatGroups({ conversations: all, kind: 'incident' });
    const investigations = nestChatGroups({ conversations: all, kind: 'investigation' });

    expect([...incidents, ...investigations].map(({ parent }) => parent.id)).not.toEqual(
      expect.arrayContaining([tuning.id])
    );
  });
});
