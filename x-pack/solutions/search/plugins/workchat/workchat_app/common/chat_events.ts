/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ChatEventBase {
  type: string;
}

interface ChunkEvent extends ChatEventBase {
  type: 'message_chunk';
  text_chunk: string;
}

export type ChatEvent = ChunkEvent;
