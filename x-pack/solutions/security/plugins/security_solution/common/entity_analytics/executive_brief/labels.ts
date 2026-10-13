/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AssessmentKey, AttentionLevel } from './brief';

/** Shared labels, so the server (prompts, events) and later UI PRs use one source. */

export const ATTENTION_LEVEL_LABELS: Record<AttentionLevel, string> = {
  urgent: i18n.translate('xpack.securitySolution.entityAnalytics.executiveBrief.level.urgent', {
    defaultMessage: 'Urgent attention needed',
  }),
  action: i18n.translate('xpack.securitySolution.entityAnalytics.executiveBrief.level.action', {
    defaultMessage: 'Attention needed',
  }),
  watch: i18n.translate('xpack.securitySolution.entityAnalytics.executiveBrief.level.watch', {
    defaultMessage: 'Keep watching',
  }),
  clear: i18n.translate('xpack.securitySolution.entityAnalytics.executiveBrief.level.clear', {
    defaultMessage: 'No action needed',
  }),
};

export const ASSESSMENT_LABELS: Record<AssessmentKey, string> = {
  threats: i18n.translate(
    'xpack.securitySolution.entityAnalytics.executiveBrief.assessment.threats',
    { defaultMessage: 'Threat activity' }
  ),
  response: i18n.translate(
    'xpack.securitySolution.entityAnalytics.executiveBrief.assessment.response',
    { defaultMessage: 'Response' }
  ),
};
