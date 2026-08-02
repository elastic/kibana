/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockNestedContainThread,
  mockNestedConversations,
  mockNestedIncident,
  mockNestedInvestigation,
  mockNestedOpenInvestigationThread,
  mockNestedTuning,
} from '../../mock/conversations';
import { nestChatGroups } from '../nest_chat_groups';
import { conversationsFromChatGroups } from '.';

describe('conversationsFromChatGroups', () => {
  const incidentGroups = nestChatGroups({
    conversations: mockNestedConversations,
    kind: 'incident',
  });
  const investigationGroups = nestChatGroups({
    conversations: mockNestedConversations,
    kind: 'investigation',
  });

  it('collects the incident parent and its nested children', () => {
    const result = conversationsFromChatGroups({
      conversations: mockNestedConversations,
      groups: incidentGroups,
    });

    expect(result.map(({ id }) => id).sort()).toEqual(
      [
        mockNestedContainThread.id,
        mockNestedIncident.id,
        mockNestedInvestigation.id,
        mockNestedTuning.id,
      ].sort()
    );
  });

  it('dedupes an investigation that is both a group header and an incident child', () => {
    const result = conversationsFromChatGroups({
      conversations: mockNestedConversations,
      groups: [...incidentGroups, ...investigationGroups],
    });

    expect(result.filter(({ id }) => id === mockNestedInvestigation.id)).toHaveLength(1);
  });

  it('includes the investigation-parented thread from the investigation group', () => {
    const result = conversationsFromChatGroups({
      conversations: mockNestedConversations,
      groups: [...incidentGroups, ...investigationGroups],
    });

    expect(result.map(({ id }) => id)).toEqual(
      expect.arrayContaining([mockNestedOpenInvestigationThread.id])
    );
  });

  it('returns nothing when no group is on screen', () => {
    expect(
      conversationsFromChatGroups({ conversations: mockNestedConversations, groups: [] })
    ).toEqual([]);
  });
});
