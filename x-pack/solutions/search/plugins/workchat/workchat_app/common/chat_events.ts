/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ChatEventBase {
  type: string;
}

export interface ChunkEvent extends ChatEventBase {
  type: 'message_chunk';
  text_chunk: string;
}

export interface CustomEvent extends ChatEventBase {
  type: 'custom';
  content: Record<string, any>;
}

export type ChatEvent = ChunkEvent | CustomEvent;
