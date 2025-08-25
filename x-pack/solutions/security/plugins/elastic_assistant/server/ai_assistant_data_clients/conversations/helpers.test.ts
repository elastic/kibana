/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdateScript } from './helpers';
import type { UpdateConversationSchema } from './update_conversation';

const getUpdateConversationMock = (): UpdateConversationSchema => {
  return {
    summary: {
      '@timestamp': '2025-08-19T13:26:01.746Z',
      semantic_content: 'Very nice demo semantic content 4.',
    },
    updated_at: '2025-08-19T13:26:01.746Z',
    api_config: {
      action_type_id: '.gen-ai',
      connector_id: 'gpt-4-1',
    },
    replacements: [],
    title: 'Viewing the Number of Open Alerts in Elastic Security',
    id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
  };
};

describe('helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUpdateScript', () => {
    it('should not return script for bulk updates', () => {
      const updateConversation = getUpdateConversationMock();
      const updateScript = getUpdateScript({
        conversation: updateConversation,
        isBulkUpdate: true,
      });
      expect(updateScript).toEqual({ doc: updateConversation });
    });

    it('should return painless update script with `assignEmpty` set to `false` for patch updates', () => {
      const updateConversation = getUpdateConversationMock();
      const updateScript = getUpdateScript({
        conversation: updateConversation,
        isBulkUpdate: false,
        isPatch: true,
      });
      expect(updateScript).toEqual({
        script: {
          source: expect.anything(),
          lang: 'painless',
          params: {
            ...updateConversation,
            assignEmpty: false,
          },
        },
      });
    });

    it('should return painless update script with `assignEmpty` set to `false` if `isPatch` is `undefined`', () => {
      const updateConversation = getUpdateConversationMock();
      const updateScript = getUpdateScript({
        conversation: updateConversation,
        isBulkUpdate: false,
      });
      expect(updateScript).toEqual({
        script: {
          source: expect.anything(),
          lang: 'painless',
          params: {
            ...updateConversation,
            assignEmpty: false,
          },
        },
      });
    });

    it('should return painless update script with `assignEmpty` set to `true` for non-patch updates', () => {
      const updateConversation = getUpdateConversationMock();
      const updateScript = getUpdateScript({
        conversation: updateConversation,
        isBulkUpdate: false,
        isPatch: false,
      });
      expect(updateScript).toEqual({
        script: {
          source: expect.anything(),
          lang: 'painless',
          params: {
            ...updateConversation,
            assignEmpty: true,
          },
        },
      });
    });
  });
});
