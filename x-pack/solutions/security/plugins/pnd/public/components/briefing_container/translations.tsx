/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RecommendedAction } from '@kbn/pnd-common';

export const EMPTY_BRIEFING_QUEUE = i18n.translate('xpack.pnd.brief.emptyBucket', {
  defaultMessage: 'No events to show.',
});

export const BRIEFING_CONTAINER_LABELS: Record<RecommendedAction, string> = Object.freeze({
  contain: i18n.translate('xpack.pnd.brief.bucket.contain', {
    defaultMessage: 'Contain',
  }),
  escalate: i18n.translate('xpack.pnd.brief.bucket.escalate', {
    defaultMessage: 'Escalate',
  }),
  investigate: i18n.translate('xpack.pnd.brief.bucket.investigate', {
    defaultMessage: 'Investigate',
  }),
  tune: i18n.translate('xpack.pnd.brief.bucket.tune', {
    defaultMessage: 'Tune',
  }),
});

export const BRIEF_CONTAINER_BUCKETS: ReadonlyArray<{ id: RecommendedAction; label: string }> =
  Object.freeze([
    { id: 'contain', label: BRIEFING_CONTAINER_LABELS.contain },
    { id: 'escalate', label: BRIEFING_CONTAINER_LABELS.escalate },
    { id: 'investigate', label: BRIEFING_CONTAINER_LABELS.investigate },
    { id: 'tune', label: BRIEFING_CONTAINER_LABELS.tune },
  ]);
