/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENT_BUILDER_API_VERSION,
  AGENT_BUILDER_CONVERSATIONS_PATH,
  AGENT_BUILDER_CONVERSE_PATH,
  AGENT_BUILDER_INTERNAL_CONVERSATIONS_PATH,
  buildAgentBuilderAttachmentsPath,
  buildAgentBuilderConversationPath,
  buildAgentBuilderConversationRenamePath,
} from '.';

describe('agent_builder_api', () => {
  it('pins the public API version', () => {
    expect(AGENT_BUILDER_API_VERSION).toEqual('2023-10-31');
  });

  it('pins the conversations path', () => {
    expect(AGENT_BUILDER_CONVERSATIONS_PATH).toEqual('/api/agent_builder/conversations');
  });

  it('uses the synchronous converse route, never the SSE one', () => {
    expect(AGENT_BUILDER_CONVERSE_PATH).toEqual('/api/agent_builder/converse');
  });

  it('builds a conversation path', () => {
    expect(buildAgentBuilderConversationPath('c-1')).toEqual(
      '/api/agent_builder/conversations/c-1'
    );
  });

  it('builds an attachments path', () => {
    expect(buildAgentBuilderAttachmentsPath('c-1')).toEqual(
      '/api/agent_builder/conversations/c-1/attachments'
    );
  });

  it('pins the internal conversations path, the one surface with no public counterpart', () => {
    expect(AGENT_BUILDER_INTERNAL_CONVERSATIONS_PATH).toEqual(
      '/internal/agent_builder/conversations'
    );
  });

  it('builds a rename path', () => {
    expect(buildAgentBuilderConversationRenamePath('c-1')).toEqual(
      '/internal/agent_builder/conversations/c-1/_rename'
    );
  });

  it('encodes a conversation id so it can never escape its path segment', () => {
    expect(buildAgentBuilderConversationPath('../../secret')).toEqual(
      '/api/agent_builder/conversations/..%2F..%2Fsecret'
    );
  });

  it('encodes a conversation id in the rename path too', () => {
    expect(buildAgentBuilderConversationRenamePath('../../secret')).toEqual(
      '/internal/agent_builder/conversations/..%2F..%2Fsecret/_rename'
    );
  });
});
