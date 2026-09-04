/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiThemeComputed } from '@elastic/eui';
import type { EntityHealthLevels } from '../../common/health_score';

/** Maps each EntityHealthLevel to an EUI colour token. */
export type HealthColors = Record<EntityHealthLevels, string>;

/** Builds the palette from the current EUI theme. Call inside a useMemo keyed on euiTheme. */
export const getHealthColors = (euiTheme: EuiThemeComputed): HealthColors => ({
  Healthy: euiTheme.colors.severity.success,
  Degraded: euiTheme.colors.severity.warning,
  Unhealthy: euiTheme.colors.severity.risk,
  Critical: euiTheme.colors.severity.danger,
  Unknown: euiTheme.colors.severity.unknown,
});

/**
 * Returns the colour for a health level string. `level` is untrusted ES|QL output —
 * anything unrecognised (including null) falls back to Unknown.
 */
export const getHealthColor = (level: string | null, colors: HealthColors): string =>
  level && level in colors ? colors[level as EntityHealthLevels] : colors.Unknown;

/**
 * Returns a human-readable tooltip string for a service node's health ring.
 * Returns undefined when there is no signal to show.
 */
export const getHealthTooltip = (
  level: string | null,
  scoreNorm: number | null | undefined
): string | undefined => {
  if (!level) return undefined;
  const hasScore = scoreNorm !== null && scoreNorm !== undefined;
  if (hasScore) {
    return i18n.translate('xpack.entitiesCaue.health.ringTooltip', {
      defaultMessage: '{level} — score {score}',
      values: { level, score: scoreNorm.toFixed(2) },
    });
  }
  return level;
};
