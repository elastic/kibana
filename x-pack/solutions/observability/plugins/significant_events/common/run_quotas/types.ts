/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MIN_RUN_LIMIT, type RunQuotaWindow } from '@kbn/nightshift-shared';

export {
  DEFAULT_RUN_QUOTA_TIME_ZONE,
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  type RunQuotaWindow,
} from '@kbn/nightshift-shared';

/**
 * `investigation` counts automatic investigations, `manual_investigation` counts manual ones (the
 * start API, the homepage, the CLI and Slack mentions), and `total_investigation` counts both.
 */
export const INVESTIGATION_RUN_QUOTA_GROUPS = [
  'investigation',
  'manual_investigation',
  'total_investigation',
] as const;

export const RUN_QUOTA_GROUPS = [
  'detection',
  ...INVESTIGATION_RUN_QUOTA_GROUPS,
  'ki_extraction',
] as const;

export type RunQuotaGroup = (typeof RUN_QUOTA_GROUPS)[number];
export type InvestigationRunQuotaGroup = (typeof INVESTIGATION_RUN_QUOTA_GROUPS)[number];

/** Investigation limits are enforced on their own, whatever the settings' `enabled` flag says. */
export const isInvestigationRunQuotaGroup = (
  group: RunQuotaGroup
): group is InvestigationRunQuotaGroup =>
  INVESTIGATION_RUN_QUOTA_GROUPS.some((candidate) => candidate === group);

export const DEFAULT_RUN_LIMITS: Readonly<Record<RunQuotaGroup, number>> = {
  detection: 15,
  investigation: 5,
  manual_investigation: 5,
  total_investigation: 10,
  ki_extraction: 3,
};

export interface RunQuotaSettings {
  /** Enforces the scheduled detection and knowledge indicator limits. */
  enabled: boolean;
  /**
   * Enforces the investigation limits. Turned off, they are not enforced but keep their values, so
   * turning them back on restores them.
   */
  investigationLimitsEnabled: boolean;
  limits: Record<RunQuotaGroup, number>;
}

export const isRunQuotaReached = ({
  group,
  enabled,
  investigationLimitsEnabled = true,
  limit,
  count,
}: {
  group: RunQuotaGroup;
  enabled: boolean;
  investigationLimitsEnabled?: boolean;
  limit: number;
  count: number;
}): boolean =>
  (isInvestigationRunQuotaGroup(group) ? investigationLimitsEnabled : enabled) &&
  limit > MIN_RUN_LIMIT &&
  count >= limit;

export const DEFAULT_RUN_QUOTA_SETTINGS: Readonly<RunQuotaSettings> = {
  enabled: true,
  investigationLimitsEnabled: true,
  limits: DEFAULT_RUN_LIMITS,
};

export interface RunQuotasResponse {
  enabled: boolean;
  investigationLimitsEnabled: boolean;
  limits: Record<RunQuotaGroup, number>;
  counts: Record<RunQuotaGroup, number>;
  window: RunQuotaWindow;
  canManage: boolean;
}

export type RunQuotaSettingsPatch =
  | {
      enabled?: boolean;
      investigationLimitsEnabled?: boolean;
      limits?: Partial<Record<RunQuotaGroup, number>>;
      activateLimits?: never;
    }
  | {
      activateLimits: Partial<Record<RunQuotaGroup, number>>;
      enabled?: never;
      investigationLimitsEnabled?: boolean;
      limits?: Partial<Record<RunQuotaGroup, number>>;
    };

/** `null` removes an investigation limit. */
export type InvestigationRunLimitsUpdate = Partial<
  Record<InvestigationRunQuotaGroup, number | null>
>;

export type RunQuotaSettingsUpdate =
  | {
      enabled?: boolean;
      investigationLimitsEnabled?: boolean;
      limits?: Partial<Record<Exclude<RunQuotaGroup, InvestigationRunQuotaGroup>, number>> &
        InvestigationRunLimitsUpdate;
      activateLimits?: never;
    }
  | {
      /**
       * Atomically enables these categories, normalizing legacy globally disabled settings
       * without overwriting categories activated by a concurrent request.
       */
      activateLimits: Partial<Record<RunQuotaGroup, number>>;
      enabled?: never;
      investigationLimitsEnabled?: boolean;
      limits?: InvestigationRunLimitsUpdate;
    };

export type RunQuotaConsumeRequest =
  | { group: 'detection' }
  | { group: 'ki_extraction' }
  | { group: 'investigation' };

export interface RunQuotaConsumeResponse {
  allowed: boolean;
  /** Configured daily limit for this group at the time of the check. */
  limit: number;
}
