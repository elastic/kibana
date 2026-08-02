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
import { countConversationsByKind } from '.';

describe('countConversationsByKind', () => {
  it('counts one of each alert-keyed kind the loop produces', () => {
    expect(countConversationsByKind(mockConversations)).toEqual({
      incident: 1,
      investigation: 1,
      thread: 0,
      tuning: 1,
    });
  });

  it('counts one thread per parked gate', () => {
    expect(countConversationsByKind(mockConversationsWithThreads)).toEqual({
      incident: 1,
      investigation: 1,
      thread: mockThreadConversations.length,
      tuning: 1,
    });
  });

  it('counts every gate of the registry as a thread rather than as its own kind', () => {
    expect(countConversationsByKind(mockThreadConversations).thread).toEqual(4);
  });

  it('reports zero for a kind that has not happened yet, so the pill still renders', () => {
    expect(countConversationsByKind([mockConversations[0]])).toEqual({
      incident: 0,
      investigation: 1,
      thread: 0,
      tuning: 0,
    });
  });

  it('reports every kind as zero for an empty list', () => {
    expect(countConversationsByKind([])).toEqual({
      incident: 0,
      investigation: 0,
      thread: 0,
      tuning: 0,
    });
  });

  it('ignores a kind the browser does not know, rather than inventing a pill for it', () => {
    const unknown: PndConversation = {
      ...mockConversations[0],
      kind: 'containment' as PndConversation['kind'],
    };

    expect(countConversationsByKind([unknown])).toEqual({
      incident: 0,
      investigation: 0,
      thread: 0,
      tuning: 0,
    });
  });
});
