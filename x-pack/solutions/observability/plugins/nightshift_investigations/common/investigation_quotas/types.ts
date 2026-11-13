/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunQuotaWindow } from '@kbn/nightshift-shared';

/**
 * `automatic_investigation` counts investigations started by automations, `manual_investigation`
 * counts manual ones (the start API, the homepage, the CLI and Slack mentions), and
 * `total_investigation` counts both.
 */
export const INVESTIGATION_QUOTA_GROUPS = [
  'automatic_investigation',
  'manual_investigation',
  'total_investigation',
] as const;

export type InvestigationQuotaGroup = (typeof INVESTIGATION_QUOTA_GROUPS)[number];

/** A limit of `null` means unlimited. */
export type InvestigationQuotaLimits = Record<InvestigationQuotaGroup, number | null>;

export type InvestigationQuotaCounts = Record<InvestigationQuotaGroup, number>;

export const DEFAULT_INVESTIGATION_QUOTA_LIMITS: Readonly<InvestigationQuotaLimits> = {
  automatic_investigation: 5,
  manual_investigation: 5,
  total_investigation: 10,
};

export interface InvestigationQuotaSettings {
  /**
   * Enforces the limits. Turned off, they are not enforced but keep their values, so turning them
   * back on restores them. Runs are still counted.
   */
  enabled: boolean;
  limits: InvestigationQuotaLimits;
}

export const DEFAULT_INVESTIGATION_QUOTA_SETTINGS: Readonly<InvestigationQuotaSettings> = {
  enabled: true,
  limits: DEFAULT_INVESTIGATION_QUOTA_LIMITS,
};

export const isInvestigationQuotaReached = ({
  enabled,
  limit,
  count,
}: {
  enabled: boolean;
  limit: number | null;
  count: number;
}): boolean => enabled && limit !== null && count >= limit;

export interface InvestigationQuotasResponse {
  enabled: boolean;
  limits: InvestigationQuotaLimits;
  counts: InvestigationQuotaCounts;
  window: RunQuotaWindow;
  /** Whether the caller may change the limits, which takes the manage and configure privileges in all spaces. */
  canManage: boolean;
}

export interface InvestigationQuotasUpdate {
  enabled?: boolean;
  /** `null` removes a limit. */
  limits?: Partial<InvestigationQuotaLimits>;
}
