/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefRange } from '../../../../common/entity_analytics/executive_brief/constants';
import type {
  AreaId,
  AttentionLevel,
  Owner,
  Urgency,
} from '../../../../common/entity_analytics/executive_brief/brief';

/** Scope id for entity flyouts opened from the brief. */
export const EXECUTIVE_BRIEF_SCOPE_ID = 'entity-analytics-executive-brief';

/** DOM ids of the sections the jump-to tabs scroll to. */
export const EXECUTIVE_BRIEF_SECTION_IDS = {
  atAGlance: 'executiveBriefAtAGlance',
  threats: 'executiveBriefThreats',
  actions: 'executiveBriefActions',
} as const;

export const EXECUTIVE_BRIEF_TEST_IDS = {
  flyout: 'executiveBriefFlyout',
  startPanel: 'executiveBriefStartPanel',
  generate: 'executiveBriefGenerate',
  regenerate: 'executiveBriefRegenerate',
  loading: 'executiveBriefLoading',
  generatingCallout: 'executiveBriefGeneratingCallout',
  error: 'executiveBriefError',
  meta: 'executiveBriefMeta',
  basedOn: 'executiveBriefBasedOn',
  connectorPicker: 'executiveBriefConnectorPicker',
  jumpNav: 'executiveBriefJumpNav',
  atAGlance: 'executiveBriefAtAGlance',
  verdict: 'executiveBriefVerdict',
  verdictLabel: 'executiveBriefVerdictLabel',
  verdictNextStep: 'executiveBriefNextStep',
  verdictTriage: 'executiveBriefVerdictTriage',
  verdictView: 'executiveBriefVerdictView',
  areaRows: 'executiveBriefAreaRows',
  threatCard: (rank: number) => `executiveBriefThreatCard-${rank}`,
} as const;

export const BRIEF_RANGE_LABELS: Record<BriefRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

export const OWNER_LABELS: Record<Owner, string> = {
  soc: 'SOC',
  it: 'IT',
  iam: 'IAM',
  cloud: 'Cloud',
  detection_engineering: 'Detection engineering',
  leadership: 'Leadership',
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  now: 'Now',
  this_week: 'This week',
  next_review: 'Next review',
};

/** Verdict label per attention level. */
export const ATTENTION_LEVEL_LABELS: Record<AttentionLevel, string> = {
  urgent: 'Urgent attention needed',
  action: 'Attention needed',
  watch: 'Keep watching',
  clear: 'No action needed',
};

/** Area names; the rows sit under the "Priority threats" heading. */
export const AREA_LABELS: Record<AreaId, string> = {
  threats: 'Threat activity',
  response: 'Response',
};
