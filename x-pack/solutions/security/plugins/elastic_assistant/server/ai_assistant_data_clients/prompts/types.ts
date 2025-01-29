/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsPromptsSchema {
  id: string;
  '@timestamp': string;
  created_at: string;
  created_by: string;
  content: string;
  is_default?: boolean;
  consumer?: string;
  color?: string;
  categories?: string[];
  is_new_conversation_default?: boolean;
  name: string;
  prompt_type: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
  updated_at?: string;
  updated_by?: string;
  namespace: string;
}

export interface UpdatePromptSchema {
  id: string;
  '@timestamp'?: string;
  color?: string;
  categories?: string[];
  is_new_conversation_default?: boolean;
  content?: string;
  updated_at?: string;
  updated_by?: string;
  prompt_type?: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
}

export interface CreatePromptSchema {
  '@timestamp'?: string;
  consumer?: string;
  color?: string;
  categories?: string[];
  is_new_conversation_default?: boolean;
  is_default?: boolean;
  name: string;
  prompt_type: string;
  content: string;
  updated_at?: string;
  updated_by?: string;
  users?: Array<{
    id?: string;
    name?: string;
  }>;
}
