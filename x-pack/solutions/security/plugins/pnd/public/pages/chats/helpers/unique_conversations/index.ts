/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndConversation } from '@kbn/pnd-common';

/**
 * First occurrence of each conversation id, so concatenating the two paged
 * kind responses does not double-count an investigation nested under its incident.
 */
export const uniqueConversations = (conversations: readonly PndConversation[]): PndConversation[] =>
  conversations.reduce<PndConversation[]>(
    (unique, conversation) =>
      unique.some(({ id }) => id === conversation.id) ? unique : [...unique, conversation],
    []
  );
