/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RecommendedAction } from './impl/schemas';

export const CONVERSATION_QUEUE_LABELS: Record<RecommendedAction, string> = Object.freeze({
  respond: i18n.translate('xpack.alertzero.conversationQueue.bucket.respond', {
    defaultMessage: 'Respond',
  }),
  investigate: i18n.translate('xpack.alertzero.conversationQueue.bucket.investigate', {
    defaultMessage: 'Investigate',
  }),
  configure: i18n.translate('xpack.alertzero.conversationQueue.bucket.configure', {
    defaultMessage: 'Configure',
  }),
  closed: i18n.translate('xpack.alertzero.conversationQueue.bucket.closed', {
    defaultMessage: 'Closed',
  }),
});

export const CONVERSATION_QUEUE_CATEGORIES: ReadonlyArray<{
  id: RecommendedAction;
  label: string;
}> = Object.freeze([
  { id: 'respond', label: CONVERSATION_QUEUE_LABELS.respond },
  { id: 'investigate', label: CONVERSATION_QUEUE_LABELS.investigate },
  { id: 'configure', label: CONVERSATION_QUEUE_LABELS.configure },
  { id: 'closed', label: CONVERSATION_QUEUE_LABELS.closed },
]);
