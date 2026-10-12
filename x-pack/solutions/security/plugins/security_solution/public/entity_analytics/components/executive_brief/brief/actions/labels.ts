/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Owner,
  Urgency,
} from '../../../../../../common/entity_analytics/executive_brief/brief';

export const TRIAGE_LABEL = 'Triage with AI Agent';

export const URGENCY_ORDER: readonly Urgency[] = ['now', 'this_week', 'next_review'];

export const URGENCY_LABEL: Record<Urgency, string> = {
  now: 'Now',
  this_week: 'This week',
  next_review: 'Next review',
};

/** Matches the traffic lights: Now is Urgent, This week is Action. */
export const URGENCY_COLOR: Record<Urgency, 'danger' | 'warning' | 'subdued'> = {
  now: 'danger',
  this_week: 'warning',
  next_review: 'subdued',
};

export const OWNER_LABEL: Record<Owner, string> = {
  soc: 'SOC',
  it: 'IT',
  iam: 'IAM',
  cloud: 'Cloud',
  detection_engineering: 'Detection engineering',
  leadership: 'Leadership',
};
