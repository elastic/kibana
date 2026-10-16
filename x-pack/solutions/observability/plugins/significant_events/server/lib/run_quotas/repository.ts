/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  DEFAULT_RUN_QUOTA_SETTINGS,
  RUN_QUOTA_GROUPS,
  type RunQuotaGroup,
  type RunQuotaSettingsUpdate,
} from '../../../common/run_quotas';
import {
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
  type RunQuotaLedgerAttributes,
  type RunQuotaSettingsAttributes,
} from './saved_objects';
import type { SignificantEventsServer } from '../../types';

const MAX_OCC_ATTEMPTS = 100;

export type RunQuotaSavedObjectsRepository = Pick<
  SavedObjectsClientContract,
  'create' | 'get' | 'update'
>;

export const createRunQuotaInternalRepository = (
  server: SignificantEventsServer
): SavedObjectsClientContract =>
  server.core.savedObjects.createInternalRepository([
    RUN_QUOTA_SETTINGS_SO_TYPE,
    RUN_QUOTA_LEDGER_SO_TYPE,
  ]);

export type RunQuotaSettingsPatch = RunQuotaSettingsUpdate;

export const createDefaultRunQuotaSettingsAttributes = (): RunQuotaSettingsAttributes => ({
  enabled: DEFAULT_RUN_QUOTA_SETTINGS.enabled,
  limits: { ...DEFAULT_RUN_QUOTA_SETTINGS.limits },
});

const mergeStoredSettings = (
  defaults: RunQuotaSettingsAttributes,
  stored: RunQuotaSettingsAttributes
): RunQuotaSettingsAttributes => ({
  ...defaults,
  ...stored,
  limits: {
    ...defaults.limits,
    ...stored.limits,
  },
});

const applySettingsPatch = (
  current: RunQuotaSettingsAttributes,
  patch: RunQuotaSettingsPatch
): RunQuotaSettingsAttributes => {
  const { activateLimits, limits, ...topLevelPatch } = patch;
  const normalizedLegacyLimits =
    activateLimits && !current.enabled
      ? Object.fromEntries(RUN_QUOTA_GROUPS.map((group) => [group, 0]))
      : {};

  return {
    ...current,
    ...topLevelPatch,
    ...(activateLimits ? { enabled: true } : {}),
    limits: {
      ...current.limits,
      ...normalizedLegacyLimits,
      ...(limits ?? {}),
      ...(activateLimits ?? {}),
    },
  };
};

export const readRunQuotaSettings = async (
  internalRepository: RunQuotaSavedObjectsRepository
): Promise<RunQuotaSettingsAttributes> => {
  try {
    const savedObject = await internalRepository.get<RunQuotaSettingsAttributes>(
      RUN_QUOTA_SETTINGS_SO_TYPE,
      RUN_QUOTA_SETTINGS_SO_ID
    );
    return mergeStoredSettings(createDefaultRunQuotaSettingsAttributes(), savedObject.attributes);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return createDefaultRunQuotaSettingsAttributes();
    }
    throw error;
  }
};

export const patchRunQuotaSettings = async (
  internalRepository: RunQuotaSavedObjectsRepository,
  patch: RunQuotaSettingsPatch
): Promise<RunQuotaSettingsAttributes> => {
  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let currentSavedObject: Awaited<ReturnType<RunQuotaSavedObjectsRepository['get']>> | undefined;

    try {
      currentSavedObject = await internalRepository.get<RunQuotaSettingsAttributes>(
        RUN_QUOTA_SETTINGS_SO_TYPE,
        RUN_QUOTA_SETTINGS_SO_ID
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        throw error;
      }
    }

    const current = currentSavedObject
      ? mergeStoredSettings(
          createDefaultRunQuotaSettingsAttributes(),
          currentSavedObject.attributes as RunQuotaSettingsAttributes
        )
      : createDefaultRunQuotaSettingsAttributes();
    const next = applySettingsPatch(current, patch);

    try {
      const savedObject = currentSavedObject
        ? await internalRepository.update<RunQuotaSettingsAttributes>(
            RUN_QUOTA_SETTINGS_SO_TYPE,
            RUN_QUOTA_SETTINGS_SO_ID,
            {
              enabled: next.enabled,
              limits: next.limits,
            },
            { version: currentSavedObject.version }
          )
        : await internalRepository.create<RunQuotaSettingsAttributes>(
            RUN_QUOTA_SETTINGS_SO_TYPE,
            next,
            { id: RUN_QUOTA_SETTINGS_SO_ID, overwrite: false }
          );
      return { ...next, ...savedObject.attributes };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw new Error('Run quota settings could not be updated after repeated conflicts');
};

export const getRunQuotaLedgerId = (date: string, group: RunQuotaGroup): string =>
  `${date}-${group}`;

export const createEmptyRunQuotaLedger = (
  date: string,
  group: RunQuotaGroup
): RunQuotaLedgerAttributes => ({
  date,
  group,
  count: 0,
});

export const readRunQuotaLedger = async (
  internalRepository: RunQuotaSavedObjectsRepository,
  date: string,
  group: RunQuotaGroup
): Promise<RunQuotaLedgerAttributes> => {
  try {
    const savedObject = await internalRepository.get<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId(date, group)
    );
    return savedObject.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return createEmptyRunQuotaLedger(date, group);
    }
    throw error;
  }
};

export interface RunQuotaLedgerMutationResult<Result> {
  attributes?: Partial<RunQuotaLedgerAttributes>;
  result: Result;
}

export type RunQuotaLedgerMutation<Result> = (
  current: RunQuotaLedgerAttributes
) => RunQuotaLedgerMutationResult<Result>;

export const mutateRunQuotaLedger = async <Result>({
  internalRepository,
  date,
  group,
  mutation,
}: {
  internalRepository: RunQuotaSavedObjectsRepository;
  date: string;
  group: RunQuotaGroup;
  mutation: RunQuotaLedgerMutation<Result>;
}): Promise<Result> => {
  const id = getRunQuotaLedgerId(date, group);

  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let currentSavedObject: Awaited<ReturnType<RunQuotaSavedObjectsRepository['get']>> | undefined;

    try {
      currentSavedObject = await internalRepository.get<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        id
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        throw error;
      }
    }

    const current = currentSavedObject
      ? (currentSavedObject.attributes as RunQuotaLedgerAttributes)
      : createEmptyRunQuotaLedger(date, group);
    const { attributes, result } = mutation(current);
    if (!attributes) {
      return result;
    }
    const next = {
      ...current,
      ...attributes,
      date,
      group,
    };

    try {
      if (currentSavedObject) {
        await internalRepository.update<RunQuotaLedgerAttributes>(
          RUN_QUOTA_LEDGER_SO_TYPE,
          id,
          next,
          { version: currentSavedObject.version }
        );
      } else {
        await internalRepository.create<RunQuotaLedgerAttributes>(RUN_QUOTA_LEDGER_SO_TYPE, next, {
          id,
          overwrite: false,
        });
      }
      return result;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }

  throw new Error('Run quota ledger could not be updated after repeated conflicts');
};
