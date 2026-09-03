/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatGroup } from '../nest_chat_groups';
import { filterChatGroups } from '.';

const group = ({
  childTitle,
  id,
  title,
}: {
  childTitle?: string;
  id: string;
  title: string;
}): ChatGroup => ({
  children:
    childTitle == null
      ? []
      : [
          {
            caseId: 'ad-1',
            description: childTitle,
            id: `${id}-child`,
            title: childTitle,
          },
        ],
  parent: { id, summary: 'ad-1', title },
  parentConversation: {
    correlationId: 'ad-1',
    createdAt: '2026-08-02T00:00:00.000Z',
    id,
    kind: 'incident',
    title,
    updatedAt: '2026-08-02T01:00:00.000Z',
  },
});

const groups = [
  group({ id: 'incident-1', title: 'Credential dumping' }),
  group({ childTitle: 'Confirm containment', id: 'incident-2', title: 'Ransomware' }),
];

describe('filterChatGroups', () => {
  it('returns every group when the query is blank', () => {
    expect(filterChatGroups({ groups, query: '  ' })).toEqual(groups);
  });

  it('matches a parent title', () => {
    expect(
      filterChatGroups({ groups, query: 'credential' }).map(({ parent }) => parent.id)
    ).toEqual(['incident-1']);
  });

  it('matches a nested child title', () => {
    expect(
      filterChatGroups({ groups, query: 'containment' }).map(({ parent }) => parent.id)
    ).toEqual(['incident-2']);
  });

  it('matches a conversation id', () => {
    expect(
      filterChatGroups({ groups, query: 'incident-1' }).map(({ parent }) => parent.id)
    ).toEqual(['incident-1']);
  });
});
