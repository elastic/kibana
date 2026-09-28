/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DIAMOND_VERTICES } from '../../../../common/attachment_enums';
import type { SeverityLevel } from '../../../../common/attachment_enums';

export { DIAMOND_VERTICES };

const SEVERITY_BADGE_COLOR: Record<SeverityLevel, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

/** EUI badge color for a severity level, defaulting to 'hollow' for unknown/missing values. */
export const severityBadgeColor = (level?: string): string =>
  (level && SEVERITY_BADGE_COLOR[level as keyof typeof SEVERITY_BADGE_COLOR]) || 'hollow';
