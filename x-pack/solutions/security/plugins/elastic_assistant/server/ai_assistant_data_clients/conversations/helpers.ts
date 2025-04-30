/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateConversationSchema } from './update_conversation';

export const getUpdateScript = ({
  conversation,
  isPatch,
}: {
  conversation: UpdateConversationSchema;
  isPatch?: boolean;
}) => {
  return {
    script: {
      source: `
    if (params.assignEmpty == true || params.containsKey('api_config')) {
      if (ctx._source.api_config != null) {
        if (params.assignEmpty == true || params.api_config.containsKey('connector_id')) {
          ctx._source.api_config.connector_id = params.api_config.connector_id;
          ctx._source.api_config.remove('model');
          ctx._source.api_config.remove('provider');
        }
        // an update to apiConfig that does not contain defaultSystemPromptId should remove it
        if (params.assignEmpty == true || (params.containsKey('api_config') && !params.api_config.containsKey('default_system_prompt_id'))) {
          ctx._source.api_config.remove('default_system_prompt_id');
        }
        if (params.assignEmpty == true || params.api_config.containsKey('action_type_id')) {
          ctx._source.api_config.action_type_id = params.api_config.action_type_id;
        }
        if (params.assignEmpty == true || params.api_config.containsKey('default_system_prompt_id')) {
          ctx._source.api_config.default_system_prompt_id = params.api_config.default_system_prompt_id;
        }
        if (params.assignEmpty == true || params.api_config.containsKey('model')) {
          ctx._source.api_config.model = params.api_config.model;
        }
        if (params.assignEmpty == true || params.api_config.containsKey('provider')) {
          ctx._source.api_config.provider = params.api_config.provider;
        }
      } else {
        ctx._source.api_config = params.api_config;
      }
    }
    if (params.assignEmpty == true || params.containsKey('exclude_from_last_conversation_storage')) {
      ctx._source.exclude_from_last_conversation_storage = params.exclude_from_last_conversation_storage;
    }
    if (params.assignEmpty == true || params.containsKey('replacements')) {
      ctx._source.replacements = params.replacements;
    }
    if (params.assignEmpty == true || params.containsKey('title')) {
      ctx._source.title = params.title;
    }
    if (params.assignEmpty == true || params.containsKey('messages')) {
      def messages = [];
      for (message in params.messages) {
        def newMessage = [:];
        newMessage['@timestamp'] = message['@timestamp'];
        newMessage.content = message.content;
        newMessage.is_error = message.is_error;
        newMessage.reader = message.reader;
        newMessage.role = message.role;
        if (message.trace_data != null) {
          newMessage.trace_data = message.trace_data;
        }
        if (message.metadata != null) {
          newMessage.metadata = [:];
          if (message.metadata.content_references != null) {
            newMessage.metadata.content_references = message.metadata.content_references;
          }
        }
        messages.add(newMessage);
      }
      ctx._source.messages = messages;
    }
    ctx._source.updated_at = params.updated_at;
  `,
      lang: 'painless',
      params: {
        ...conversation, // when assigning undefined in painless, it will remove property and wil set it to null
        // for patch we don't want to remove unspecified value in payload
        assignEmpty: !(isPatch ?? true),
      },
    },
  };
};
