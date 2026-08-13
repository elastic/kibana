/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RecommendedAction } from './impl/schemas';

export const CONVERSATION_QUEUE_LABELS: Record<RecommendedAction, string> = Object.freeze({
  contain: i18n.translate('xpack.pnd.conversationQueue.bucket.contain', {
    defaultMessage: 'Contain',
  }),
  escalate: i18n.translate('xpack.pnd.conversationQueue.bucket.escalate', {
    defaultMessage: 'Escalate',
  }),
  investigate: i18n.translate('xpack.pnd.conversationQueue.bucket.investigate', {
    defaultMessage: 'Investigate',
  }),
  tune: i18n.translate('xpack.pnd.conversationQueue.bucket.tune', {
    defaultMessage: 'Tune',
  }),
});

export const CONVERSATION_QUEUE_CATEGORIES: ReadonlyArray<{
  id: RecommendedAction;
  label: string;
}> = Object.freeze([
  { id: 'contain', label: CONVERSATION_QUEUE_LABELS.contain },
  { id: 'escalate', label: CONVERSATION_QUEUE_LABELS.escalate },
  { id: 'investigate', label: CONVERSATION_QUEUE_LABELS.investigate },
  { id: 'tune', label: CONVERSATION_QUEUE_LABELS.tune },
]);
