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
    it('should always return a doc for bulk updates', () => {
      const updateConversation = getUpdateConversationMock();
      const updateScript = getUpdateScript({ conversation: updateConversation });
      expect(updateScript).toEqual({ doc: updateConversation });
    });
  });
});
