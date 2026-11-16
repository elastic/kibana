/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_INVESTIGATION_QUOTA_LIMITS,
  INVESTIGATION_QUOTA_GROUPS,
  type InvestigationQuotaGroup,
  type InvestigationQuotaLimits,
  type InvestigationQuotasResponse,
  type InvestigationQuotasUpdate,
} from '@kbn/nightshift-investigations-plugin/common';
import { MAX_RUN_LIMIT } from '@kbn/nightshift-shared';

export { INVESTIGATION_QUOTA_GROUPS, MAX_RUN_LIMIT };

export const MIN_INVESTIGATION_LIMIT = 1;

/** An input left empty is an unlimited limit. */
export type InvestigationLimitDraft = number | '';

export interface InvestigationQuotaDraftState {
  saved: { enabled: boolean; limits: InvestigationQuotaLimits };
  draft: {
    enabled: boolean;
    limits: Record<InvestigationQuotaGroup, InvestigationLimitDraft>;
    /** The finite limit to bring back for a limit that is unlimited, when the switch turns on. */
    restoreLimits: Record<InvestigationQuotaGroup, number>;
  };
}

const mapGroups = <T>(
  toValue: (group: InvestigationQuotaGroup) => T
): Record<InvestigationQuotaGroup, T> => ({
  automatic_investigation: toValue('automatic_investigation'),
  manual_investigation: toValue('manual_investigation'),
  total_investigation: toValue('total_investigation'),
});

export const parseInvestigationLimitDraft = (value: string): InvestigationLimitDraft =>
  value === '' ? '' : Number(value);

export const isValidFiniteInvestigationLimit = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_INVESTIGATION_LIMIT &&
  value <= MAX_RUN_LIMIT;

const isValidLimitDraft = (value: InvestigationLimitDraft): boolean =>
  value === '' || isValidFiniteInvestigationLimit(value);

const toStoredLimit = (draft: InvestigationLimitDraft): number | null =>
  draft === '' ? null : draft;

export const createInvestigationQuotaDraftState = ({
  enabled,
  limits,
}: Pick<InvestigationQuotasResponse, 'enabled' | 'limits'>): InvestigationQuotaDraftState => ({
  saved: { enabled, limits },
  draft: {
    enabled,
    limits: mapGroups((group) => limits[group] ?? ''),
    restoreLimits: mapGroups((group) => limits[group] ?? DEFAULT_INVESTIGATION_QUOTA_LIMITS[group]),
  },
});

/**
 * Keeps the finite limit to restore for each limit `next` stores as unlimited, so turning the
 * switch back on after a save or a refresh restores the value it had rather than the default.
 */
export const keepRestoreLimits = (
  next: InvestigationQuotaDraftState,
  previous?: InvestigationQuotaDraftState
): InvestigationQuotaDraftState =>
  previous
    ? {
        ...next,
        draft: {
          ...next.draft,
          restoreLimits: mapGroups((group) =>
            next.saved.limits[group] === null
              ? previous.draft.restoreLimits[group]
              : next.draft.restoreLimits[group]
          ),
        },
      }
    : next;

export const hasInvestigationQuotaDraftChanges = ({
  saved,
  draft,
}: InvestigationQuotaDraftState): boolean =>
  saved.enabled !== draft.enabled ||
  INVESTIGATION_QUOTA_GROUPS.some(
    (group) => toStoredLimit(draft.limits[group]) !== saved.limits[group]
  );

export const isInvestigationQuotaDraftValid = ({ draft }: InvestigationQuotaDraftState): boolean =>
  INVESTIGATION_QUOTA_GROUPS.every((group) => isValidLimitDraft(draft.limits[group]));

/**
 * Turns the limits on or off, keeping their values. Turning them on while every one is unlimited
 * brings back the remembered limits, so the switch on always enforces a limit.
 */
export const setInvestigationQuotaEnabled = (
  state: InvestigationQuotaDraftState,
  enabled: boolean
): InvestigationQuotaDraftState => {
  const allUnlimited = INVESTIGATION_QUOTA_GROUPS.every(
    (group) => state.draft.limits[group] === ''
  );
  return {
    ...state,
    draft: {
      ...state.draft,
      enabled,
      limits: enabled && allUnlimited ? { ...state.draft.restoreLimits } : state.draft.limits,
    },
  };
};

export const buildInvestigationQuotaUpdate = (
  state: InvestigationQuotaDraftState
): InvestigationQuotasUpdate | undefined => {
  if (!isInvestigationQuotaDraftValid(state)) {
    return undefined;
  }

  const changedLimits: Partial<InvestigationQuotaLimits> = {};
  for (const group of INVESTIGATION_QUOTA_GROUPS) {
    const next = toStoredLimit(state.draft.limits[group]);
    if (next !== state.saved.limits[group]) {
      changedLimits[group] = next;
    }
  }

  const enabledChanged = state.saved.enabled !== state.draft.enabled;
  const limitsChanged = Object.keys(changedLimits).length > 0;
  if (!enabledChanged && !limitsChanged) {
    return undefined;
  }
  return {
    ...(enabledChanged ? { enabled: state.draft.enabled } : {}),
    ...(limitsChanged ? { limits: changedLimits } : {}),
  };
};

/** Whether `next` is a finite limit below `previous`, or a finite limit for one that was unlimited. */
export const isLowerFiniteLimit = (
  previous: number | null,
  next: InvestigationLimitDraft
): next is number =>
  isValidFiniteInvestigationLimit(next) && (previous === null || next < previous);
