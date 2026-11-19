/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import {
  buildDiscoverEsqlAttachment,
  openRuleAuthoringAgentChat,
} from './open_rule_authoring_agent_chat';

describe('openRuleAuthoringAgentChat', () => {
  it('builds an ES|QL attachment from the Discover query', () => {
    const attachment = buildDiscoverEsqlAttachment('FROM logs-* | LIMIT 10');
    expect(attachment.type).toBe(AttachmentType.esql);
    expect(attachment.data).toEqual(
      expect.objectContaining({
        query: 'FROM logs-* | LIMIT 10',
      })
    );
  });

  it('opens chat with the ES|QL attachment when a query is provided', () => {
    const openChat = jest.fn();
    openRuleAuthoringAgentChat({
      agentBuilder: { openChat } as never,
      application: { navigateToApp: jest.fn() } as never,
      userInput: 'alert on errors',
      esqlQuery: 'FROM logs-* | WHERE status >= 500',
    });

    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        autoSendInitialMessage: true,
        attachments: [
          expect.objectContaining({
            type: AttachmentType.esql,
            data: expect.objectContaining({
              query: 'FROM logs-* | WHERE status >= 500',
            }),
          }),
        ],
      })
    );
  });

  it('opens chat without attachments when there is no query', () => {
    const openChat = jest.fn();
    openRuleAuthoringAgentChat({
      agentBuilder: { openChat } as never,
      application: { navigateToApp: jest.fn() } as never,
      userInput: 'alert on errors',
    });

    expect(openChat).toHaveBeenCalledWith(
      expect.objectContaining({
        newConversation: true,
        autoSendInitialMessage: true,
      })
    );
    expect(openChat.mock.calls[0][0].attachments).toBeUndefined();
  });
});
