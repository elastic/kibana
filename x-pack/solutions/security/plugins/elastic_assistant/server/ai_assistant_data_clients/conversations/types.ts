/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationCategory,
  ConversationConfidence,
  MessageRole,
  Provider,
  Reader,
} from '@kbn/elastic-assistant-common';

export interface EsReplacementSchema {
  value: string;
  uuid: string;
}

export interface EsConversationSchema {
  id: string;
  '@timestamp': string;
  created_at: string;
  title: string;
  summary?: {
    content?: string;
    timestamp?: string;
    public?: boolean;
    confidence?: ConversationConfidence;
  };
  category: ConversationCategory;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: Reader;
    role: MessageRole;
    is_error?: boolean;
    trace_data?: {
      transaction_id?: string;
      trace_id?: string;
    };
  }>;
  api_config?: {
    connector_id: string;
    action_type_id: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  is_default?: boolean;
  exclude_from_last_conversation_storage?: boolean;
  replacements?: EsReplacementSchema[];
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  namespace: string;
}

export interface CreateMessageSchema {
  '@timestamp'?: string;
  created_at: string;
  title: string;
  id?: string | undefined;
  category: ConversationCategory;
  messages?: Array<{
    '@timestamp': string;
    content: string;
    reader?: Reader;
    role: MessageRole;
    is_error?: boolean;
    trace_data?: {
      transaction_id?: string;
      trace_id?: string;
    };
  }>;
  api_config?: {
    action_type_id: string;
    connector_id: string;
    default_system_prompt_id?: string;
    provider?: Provider;
    model?: string;
  };
  is_default?: boolean;
  exclude_from_last_conversation_storage?: boolean;
  replacements?: EsReplacementSchema[];
  users: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  namespace: string;
}
