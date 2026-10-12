/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BriefThreat } from '../../../../../../common/entity_analytics/executive_brief/brief';

export const STATUS_LABEL: Record<BriefThreat['status'], string> = {
  unaddressed: 'Unaddressed',
  in_progress: 'Being handled',
  contained: 'Contained',
};

export const STATUS_COLOR: Record<BriefThreat['status'], 'warning' | 'primary' | 'success'> = {
  unaddressed: 'warning',
  in_progress: 'primary',
  contained: 'success',
};

export const CONFIDENCE_LABEL: Record<BriefThreat['confidence'], string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

export const SEVERITY_LABEL: Record<BriefThreat['severity'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
