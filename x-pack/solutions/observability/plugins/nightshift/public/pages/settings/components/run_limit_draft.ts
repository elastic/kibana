/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_RUN_LIMITS,
  INVESTIGATION_RUN_QUOTA_GROUPS,
  isInvestigationRunQuotaGroup,
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  RUN_QUOTA_GROUPS,
  type InvestigationRunLimitsUpdate,
  type RunQuotaGroup,
  type RunQuotaSettingsUpdate,
  type RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';

export { MAX_RUN_LIMIT, MIN_RUN_LIMIT, RUN_QUOTA_GROUPS };

const isGloballyGated = (group: RunQuotaGroup): boolean => !isInvestigationRunQuotaGroup(group);

/** An investigation limit turned off is sent as `null`. */
const toLimitUpdate = (group: RunQuotaGroup, limit: number): number | null =>
  isInvestigationRunQuotaGroup(group) && limit === MIN_RUN_LIMIT ? null : limit;

export type RunLimitDraft = number | '';

interface SavedRunQuotaSettings {
  enabled: boolean;
  investigationLimitsEnabled: boolean;
  limits: Record<RunQuotaGroup, number>;
}

export interface RunQuotaDraftState {
  saved: SavedRunQuotaSettings;
  draft: {
    enabled: boolean;
    investigationLimitsEnabled: boolean;
    limits: Record<RunQuotaGroup, RunLimitDraft>;
    restoreLimits: Record<RunQuotaGroup, number>;
  };
}

export const parseRunLimitDraft = (value: string): RunLimitDraft =>
  value === '' ? '' : Number(value);

export const isValidLimitedRunLimitDraft = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value > MIN_RUN_LIMIT &&
  value <= MAX_RUN_LIMIT;

export const isValidRunLimitDraft = (value: unknown): value is number =>
  value === MIN_RUN_LIMIT || isValidLimitedRunLimitDraft(value);

export const createRunQuotaDraftState = ({
  enabled,
  investigationLimitsEnabled = true,
  limits,
}: Pick<RunQuotasResponse, 'enabled'> & {
  investigationLimitsEnabled?: boolean;
  limits?: Partial<Record<RunQuotaGroup, number>>;
}): RunQuotaDraftState => {
  const resolvedLimits = Object.fromEntries(
    RUN_QUOTA_GROUPS.map((group) => {
      const limit = limits?.[group];
      return [group, isValidRunLimitDraft(limit) ? limit : DEFAULT_RUN_LIMITS[group]];
    })
  ) as Record<RunQuotaGroup, number>;
  const effectiveLimits = Object.fromEntries(
    RUN_QUOTA_GROUPS.map((group) => [
      group,
      enabled || !isGloballyGated(group) ? resolvedLimits[group] : MIN_RUN_LIMIT,
    ])
  ) as Record<RunQuotaGroup, number>;

  return {
    saved: {
      enabled,
      investigationLimitsEnabled,
      limits: effectiveLimits,
    },
    draft: {
      enabled,
      investigationLimitsEnabled,
      limits: { ...effectiveLimits },
      restoreLimits: Object.fromEntries(
        RUN_QUOTA_GROUPS.map((group) => [
          group,
          isValidLimitedRunLimitDraft(resolvedLimits[group])
            ? resolvedLimits[group]
            : DEFAULT_RUN_LIMITS[group],
        ])
      ) as Record<RunQuotaGroup, number>,
    },
  };
};

/**
 * Keeps the finite limit to restore for each limit `next` stores as unlimited, so turning a limit
 * back on after a save or a refresh restores the value it had rather than the default.
 */
export const keepRestoreLimits = (
  next: RunQuotaDraftState,
  previous?: RunQuotaDraftState
): RunQuotaDraftState =>
  previous
    ? {
        ...next,
        draft: {
          ...next.draft,
          restoreLimits: Object.fromEntries(
            RUN_QUOTA_GROUPS.map((group) => [
              group,
              next.saved.limits[group] === MIN_RUN_LIMIT
                ? previous.draft.restoreLimits[group]
                : next.draft.restoreLimits[group],
            ])
          ) as Record<RunQuotaGroup, number>,
        },
      }
    : next;

/** Reads every empty draft limit as unlimited, for a form in which an empty input means no limit. */
export const withEmptyLimitsAsUnlimited = (state: RunQuotaDraftState): RunQuotaDraftState => ({
  ...state,
  draft: {
    ...state.draft,
    limits: Object.fromEntries(
      RUN_QUOTA_GROUPS.map((group) => {
        const limit = state.draft.limits[group];
        return [group, limit === '' ? MIN_RUN_LIMIT : limit];
      })
    ) as Record<RunQuotaGroup, RunLimitDraft>,
  },
});

export const hasRunQuotaDraftChanges = ({ saved, draft }: RunQuotaDraftState): boolean =>
  saved.enabled !== draft.enabled ||
  saved.investigationLimitsEnabled !== draft.investigationLimitsEnabled ||
  RUN_QUOTA_GROUPS.some((group) => saved.limits[group] !== draft.limits[group]);

export const isRunQuotaDraftValid = (
  state: RunQuotaDraftState
): state is RunQuotaDraftState & {
  draft: { limits: Record<RunQuotaGroup, number> };
} => RUN_QUOTA_GROUPS.every((group) => isValidRunLimitDraft(state.draft.limits[group]));

/**
 * Turns the investigation limits on or off, keeping their values. Turning them on while every one
 * is unlimited restores the remembered limits, so the switch on always enforces a limit.
 */
export const setInvestigationLimitsEnabled = (
  state: RunQuotaDraftState,
  enabled: boolean
): RunQuotaDraftState => {
  const limits = { ...state.draft.limits };
  if (
    enabled &&
    INVESTIGATION_RUN_QUOTA_GROUPS.every((group) => !isFiniteRunLimit(limits[group]))
  ) {
    for (const group of INVESTIGATION_RUN_QUOTA_GROUPS) {
      limits[group] = state.draft.restoreLimits[group];
    }
  }
  return { ...state, draft: { ...state.draft, investigationLimitsEnabled: enabled, limits } };
};

export const setRunLimitEnabled = (
  state: RunQuotaDraftState,
  group: RunQuotaGroup,
  enabled: boolean
): RunQuotaDraftState => {
  if (enabled) {
    return {
      ...state,
      draft: {
        ...state.draft,
        enabled: isGloballyGated(group) ? true : state.draft.enabled,
        limits: {
          ...state.draft.limits,
          [group]: state.draft.restoreLimits[group],
        },
      },
    };
  }

  const currentLimit = state.draft.limits[group];
  const limits = {
    ...state.draft.limits,
    [group]: MIN_RUN_LIMIT,
  };
  return {
    ...state,
    draft: {
      ...state.draft,
      enabled:
        state.saved.enabled ||
        RUN_QUOTA_GROUPS.some(
          (quotaGroup) =>
            isGloballyGated(quotaGroup) && isValidLimitedRunLimitDraft(limits[quotaGroup])
        ),
      limits,
      restoreLimits: {
        ...state.draft.restoreLimits,
        ...(isValidLimitedRunLimitDraft(currentLimit) ? { [group]: currentLimit } : {}),
      },
    },
  };
};

export const buildRunQuotaSettingsUpdate = (
  state: RunQuotaDraftState
): RunQuotaSettingsUpdate | undefined => {
  if (!isRunQuotaDraftValid(state)) {
    return undefined;
  }

  const hasActiveDraftLimits = RUN_QUOTA_GROUPS.some(
    (group) => isGloballyGated(group) && isValidLimitedRunLimitDraft(state.draft.limits[group])
  );
  if (!state.saved.enabled && hasActiveDraftLimits) {
    const activateLimits = Object.fromEntries(
      RUN_QUOTA_GROUPS.flatMap((group) =>
        isGloballyGated(group) && isValidLimitedRunLimitDraft(state.draft.limits[group])
          ? [[group, state.draft.limits[group]]]
          : []
      )
    ) as Partial<Record<RunQuotaGroup, number>>;

    const investigationLimits: InvestigationRunLimitsUpdate = Object.fromEntries(
      INVESTIGATION_RUN_QUOTA_GROUPS.flatMap((group) => {
        const next = state.draft.limits[group];
        return state.saved.limits[group] === next ? [] : [[group, toLimitUpdate(group, next)]];
      })
    );
    return Object.keys(activateLimits).length > 0
      ? {
          activateLimits,
          ...(state.saved.investigationLimitsEnabled !== state.draft.investigationLimitsEnabled
            ? { investigationLimitsEnabled: state.draft.investigationLimitsEnabled }
            : {}),
          ...(Object.keys(investigationLimits).length > 0 ? { limits: investigationLimits } : {}),
        }
      : undefined;
  }

  const update: RunQuotaSettingsUpdate = {};
  if (state.saved.enabled !== state.draft.enabled) {
    update.enabled = state.draft.enabled;
  }
  if (state.saved.investigationLimitsEnabled !== state.draft.investigationLimitsEnabled) {
    update.investigationLimitsEnabled = state.draft.investigationLimitsEnabled;
  }

  const changedLimits = Object.fromEntries(
    RUN_QUOTA_GROUPS.flatMap((group) => {
      const next = state.draft.limits[group];
      if (state.saved.limits[group] === next) {
        return [];
      }
      return [[group, toLimitUpdate(group, next)]];
    })
  ) as NonNullable<RunQuotaSettingsUpdate['limits']>;

  if (Object.keys(changedLimits).length > 0) {
    update.limits = changedLimits;
  }

  return update.enabled === undefined &&
    update.investigationLimitsEnabled === undefined &&
    update.limits === undefined
    ? undefined
    : update;
};

export const isFiniteRunLimit = (limit: RunLimitDraft): limit is number =>
  isValidRunLimitDraft(limit) && limit > 0;

export const isLowerFiniteLimit = (previous: number, next: RunLimitDraft): next is number => {
  if (!isFiniteRunLimit(next)) {
    return false;
  }
  return previous === 0 || next < previous;
};
