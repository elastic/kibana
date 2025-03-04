/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { Conversation } from '../../../common/conversations';
import type { ConversationAttributes } from '../../saved_objects/conversations';

export const fromModel = (obj: SavedObject<ConversationAttributes>): Conversation => {
  // TODO
  return obj;
};
