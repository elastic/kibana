/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SupportCase {
  id?: string;
  title?: string;
  content?: string;
  content_semantic?: string;
  url?: string;
  object_type?: string;
  owner?: {
    name?: string;
    emailaddress?: string;
  };
  created_at?: string | Date;
  updated_at?: string | Date;
  metadata?: {
    case_number?: string;
    priority?: string;
    status?: string;
    closed?: boolean;
    deleted?: boolean;
  };
  comments?: Array<{
    id?: string;
    author?: {
      email?: string;
      name?: string;
    };
    content?: {
      text?: string;
    };
    created_at?: string | Date;
    updated_at?: string | Date;
  }>;
}
