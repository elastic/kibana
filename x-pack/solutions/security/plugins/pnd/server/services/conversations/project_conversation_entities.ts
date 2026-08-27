/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationWithoutRounds } from '@kbn/agent-builder-common';
import type { ConversationEntity } from '@kbn/pnd-common';
import { extractConversationEntities } from '@kbn/pnd-common';

export const projectConversationEntities = (
  conversation: Pick<ConversationWithoutRounds, 'attachments'>
): ConversationEntity[] => extractConversationEntities(conversation.attachments ?? []);
