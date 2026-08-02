/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CONVERSATION_ID_QUERY_PARAM,
  buildConversationSearch,
  clearConversationSearch,
  readConversationId,
} from '.';

describe('conversation search params', () => {
  describe('CONVERSATION_ID_QUERY_PARAM', () => {
    it('is the param the chats page opens a detail panel on', () => {
      expect(CONVERSATION_ID_QUERY_PARAM).toEqual('conversationId');
    });
  });

  describe('readConversationId', () => {
    it('returns the conversation the panel is open on', () => {
      expect(readConversationId('?conversationId=conversation-1')).toEqual('conversation-1');
    });

    it('returns the conversation when other params travel alongside it', () => {
      expect(readConversationId('?lifecycle=ad-alert-1&conversationId=conversation-1')).toEqual(
        'conversation-1'
      );
    });

    it('decodes a percent-encoded id', () => {
      expect(readConversationId('?conversationId=conversation%2F1')).toEqual('conversation/1');
    });

    it('returns undefined when the panel is closed', () => {
      expect(readConversationId('?lifecycle=ad-alert-1')).toBeUndefined();
    });

    it('returns undefined for an empty search string', () => {
      expect(readConversationId('')).toBeUndefined();
    });

    it('returns undefined for a blank id, so an empty param does not open an empty panel', () => {
      expect(readConversationId('?conversationId=')).toBeUndefined();
    });
  });

  describe('buildConversationSearch', () => {
    it('opens the panel on a conversation', () => {
      expect(buildConversationSearch('', 'conversation-1')).toEqual(
        '?conversationId=conversation-1'
      );
    });

    it('keeps the params the page already had', () => {
      expect(buildConversationSearch('?history=1', 'conversation-1')).toEqual(
        '?history=1&conversationId=conversation-1'
      );
    });

    it('replaces the conversation the panel was already open on', () => {
      expect(buildConversationSearch('?conversationId=conversation-1', 'conversation-2')).toEqual(
        '?conversationId=conversation-2'
      );
    });

    it('encodes an id that is not URL safe', () => {
      expect(buildConversationSearch('', 'conversation/1')).toEqual(
        '?conversationId=conversation%2F1'
      );
    });
  });

  describe('clearConversationSearch', () => {
    it('closes the panel', () => {
      expect(clearConversationSearch('?conversationId=conversation-1')).toEqual('');
    });

    it('keeps the params the page already had', () => {
      expect(clearConversationSearch('?conversationId=conversation-1&history=1')).toEqual(
        '?history=1'
      );
    });

    it('is a no-op when the panel is already closed', () => {
      expect(clearConversationSearch('?history=1')).toEqual('?history=1');
    });

    it('returns an empty search string rather than a bare question mark', () => {
      expect(clearConversationSearch('')).toEqual('');
    });
  });
});
