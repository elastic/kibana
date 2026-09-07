/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_CONVERSATION_QUEUE = Object.freeze({
  emptyQueue: i18n.translate('xpack.pnd.conversationQueue.emptyBucket', {
    defaultMessage: 'No events in this category.',
  }),
  emptyQueueWithFilter: i18n.translate('xpack.pnd.conversationQueue.emptyBucketWithFilter', {
    defaultMessage: 'No events match the current filter.',
  }),
});
