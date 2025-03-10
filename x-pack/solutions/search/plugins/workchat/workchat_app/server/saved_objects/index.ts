/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import { conversationType } from './conversations';

export const registerTypes = ({ savedObjects }: { savedObjects: SavedObjectsServiceSetup }) => {
  savedObjects.registerType(conversationType);
};

export type { ConversationAttributes } from './conversations';
