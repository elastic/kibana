/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_RUN_LIMITS,
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  RUN_QUOTA_GROUPS,
  type RunQuotaGroup,
  type RunQuotaSettingsUpdate,
  type RunQuotasResponse,
} from '@kbn/significant-events-plugin/common';

export { MAX_RUN_LIMIT, MIN_RUN_LIMIT, RUN_QUOTA_GROUPS };

export type RunLimitDraft = number | '';

interface SavedRunQuotaSettings {
  enabled: boolean;
  limits: Record<RunQuotaGroup, number>;
}

export interface RunQuotaDraftState {
  saved: SavedRunQuotaSettings;
  draft: {
    enabled: boolean;
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
  limits,
}: Pick<RunQuotasResponse, 'enabled'> & {
  limits?: Partial<Record<RunQuotaGroup, number>>;
}): RunQuotaDraftState => {
  const resolvedLimits = Object.fromEntries(
    RUN_QUOTA_GROUPS.map((group) => {
      const limit = limits?.[group];
      return [group, isValidRunLimitDraft(limit) ? limit : DEFAULT_RUN_LIMITS[group]];
    })
  ) as Record<RunQuotaGroup, number>;
  const effectiveLimits = enabled
    ? resolvedLimits
    : (Object.fromEntries(RUN_QUOTA_GROUPS.map((group) => [group, MIN_RUN_LIMIT])) as Record<
        RunQuotaGroup,
        number
      >);

  return {
    saved: {
      enabled,
      limits: effectiveLimits,
    },
    draft: {
      enabled,
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

export const hasRunQuotaDraftChanges = ({ saved, draft }: RunQuotaDraftState): boolean =>
  saved.enabled !== draft.enabled ||
  RUN_QUOTA_GROUPS.some((group) => saved.limits[group] !== draft.limits[group]);

export const isRunQuotaDraftValid = (
  state: RunQuotaDraftState
): state is RunQuotaDraftState & {
  draft: { limits: Record<RunQuotaGroup, number> };
} => RUN_QUOTA_GROUPS.every((group) => isValidRunLimitDraft(state.draft.limits[group]));

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
        enabled: true,
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
        RUN_QUOTA_GROUPS.some((quotaGroup) => isValidLimitedRunLimitDraft(limits[quotaGroup])),
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

  const hasActiveDraftLimits = RUN_QUOTA_GROUPS.some((group) =>
    isValidLimitedRunLimitDraft(state.draft.limits[group])
  );
  if (!state.saved.enabled && hasActiveDraftLimits) {
    const activateLimits = Object.fromEntries(
      RUN_QUOTA_GROUPS.flatMap((group) =>
        isValidLimitedRunLimitDraft(state.draft.limits[group])
          ? [[group, state.draft.limits[group]]]
          : []
      )
    ) as Partial<Record<RunQuotaGroup, number>>;

    return Object.keys(activateLimits).length > 0 ? { activateLimits } : undefined;
  }

  const update: RunQuotaSettingsUpdate = {};
  if (state.saved.enabled !== state.draft.enabled) {
    update.enabled = state.draft.enabled;
  }

  const changedLimits = Object.fromEntries(
    RUN_QUOTA_GROUPS.flatMap((group) =>
      state.saved.limits[group] === state.draft.limits[group]
        ? []
        : [[group, state.draft.limits[group]]]
    )
  ) as Partial<Record<RunQuotaGroup, number>>;

  if (Object.keys(changedLimits).length > 0) {
    update.limits = changedLimits;
  }

  return update.enabled === undefined && update.limits === undefined ? undefined : update;
};

export const isFiniteRunLimit = (limit: RunLimitDraft): limit is number =>
  isValidRunLimitDraft(limit) && limit > 0;

export const isLowerFiniteLimit = (previous: number, next: RunLimitDraft): next is number => {
  if (!isFiniteRunLimit(next)) {
    return false;
  }
  return previous === 0 || next < previous;
};
