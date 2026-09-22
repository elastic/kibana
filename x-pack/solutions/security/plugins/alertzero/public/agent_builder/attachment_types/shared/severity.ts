/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SEVERITY_LEVELS, DIAMOND_VERTICES } from '../../../../common/attachment_enums';
import type { SeverityLevel, DiamondVertex } from '../../../../common/attachment_enums';

export { SEVERITY_LEVELS, DIAMOND_VERTICES };
export type { SeverityLevel, DiamondVertex };

export const SEVERITY_BADGE_COLOR: Record<SeverityLevel, string> = {
  low: 'hollow',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

/** EUI badge color for a severity level, defaulting to 'hollow' for unknown/missing values. */
export const severityBadgeColor = (level?: string): string =>
  (level && SEVERITY_BADGE_COLOR[level as keyof typeof SEVERITY_BADGE_COLOR]) || 'hollow';

/** Formats a 0..1 fraction as a percentage string, e.g. 0.9 -> "90%". */
export const formatPercent = (value: number): string =>
  i18n.translate('xpack.alertzero.agentBuilder.attachments.shared.confidencePercent', {
    defaultMessage: '{value, number, percent}',
    values: { value },
  });
