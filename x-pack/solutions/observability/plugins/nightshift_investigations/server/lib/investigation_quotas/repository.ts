/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  DEFAULT_INVESTIGATION_QUOTA_SETTINGS,
  type InvestigationQuotaGroup,
  type InvestigationQuotaLimits,
  type InvestigationQuotaSettings,
  type InvestigationQuotasUpdate,
} from '../../../common/investigation_quotas';
import {
  NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
  NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID,
  NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
  type NightshiftInvestigationQuotaLedgerAttributes,
  type NightshiftInvestigationQuotaSettingsAttributes,
} from '../../saved_objects';

const MAX_OCC_ATTEMPTS = 100;

export type InvestigationQuotaSavedObjectsRepository = Pick<
  SavedObjectsClientContract,
  'create' | 'get' | 'update'
>;

export const createDefaultInvestigationQuotaSettings = (): InvestigationQuotaSettings => ({
  enabled: DEFAULT_INVESTIGATION_QUOTA_SETTINGS.enabled,
  limits: { ...DEFAULT_INVESTIGATION_QUOTA_SETTINGS.limits },
});

// A stored `null` is an unlimited limit, so it is kept rather than replaced by the default.
const fromStoredSettings = (
  stored: NightshiftInvestigationQuotaSettingsAttributes
): InvestigationQuotaSettings => ({
  enabled: stored.enabled,
  limits: {
    automatic_investigation: stored.limits.automatic_investigation,
    manual_investigation: stored.limits.manual_investigation,
    total_investigation: stored.limits.total_investigation,
  },
});

const applySettingsUpdate = (
  current: InvestigationQuotaSettings,
  update: InvestigationQuotasUpdate
): InvestigationQuotaSettings => {
  const limitFor = (group: InvestigationQuotaGroup): number | null => {
    const next = update.limits?.[group];
    return next === undefined ? current.limits[group] : next;
  };
  const limits: InvestigationQuotaLimits = {
    automatic_investigation: limitFor('automatic_investigation'),
    manual_investigation: limitFor('manual_investigation'),
    total_investigation: limitFor('total_investigation'),
  };
  return { enabled: update.enabled ?? current.enabled, limits };
};

export const readInvestigationQuotaSettings = async (
  repository: InvestigationQuotaSavedObjectsRepository
): Promise<InvestigationQuotaSettings> => {
  try {
    const savedObject = await repository.get<NightshiftInvestigationQuotaSettingsAttributes>(
      NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
      NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID
    );
    return fromStoredSettings(savedObject.attributes);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return createDefaultInvestigationQuotaSettings();
    }
    throw error;
  }
};

export interface InvestigationQuotaSettingsChange {
  /** The settings the update was applied to, which are the defaults when nothing was stored. */
  previous: InvestigationQuotaSettings;
  next: InvestigationQuotaSettings;
}

/**
 * Applies the update to the latest stored settings, retrying when a concurrent update wins, and
 * returns the settings it replaced along with the ones it wrote.
 */
export const applyInvestigationQuotaSettingsUpdate = async (
  repository: InvestigationQuotaSavedObjectsRepository,
  update: InvestigationQuotasUpdate
): Promise<InvestigationQuotaSettingsChange> => {
  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let currentSavedObject: SavedObject<NightshiftInvestigationQuotaSettingsAttributes> | undefined;

    try {
      currentSavedObject = await repository.get<NightshiftInvestigationQuotaSettingsAttributes>(
        NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
        NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }

    const current = currentSavedObject
      ? fromStoredSettings(currentSavedObject.attributes)
      : createDefaultInvestigationQuotaSettings();
    const next = applySettingsUpdate(current, update);

    try {
      if (currentSavedObject) {
        await repository.update<NightshiftInvestigationQuotaSettingsAttributes>(
          NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
          NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID,
          next,
          { version: currentSavedObject.version }
        );
      } else {
        await repository.create<NightshiftInvestigationQuotaSettingsAttributes>(
          NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_TYPE,
          next,
          { id: NIGHTSHIFT_INVESTIGATION_QUOTA_SETTINGS_SO_ID, overwrite: false }
        );
      }
      return { previous: current, next };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }
  }

  throw new Error('Investigation quota settings could not be updated after repeated conflicts');
};

/** Applies the update to the latest stored settings, retrying when a concurrent update wins. */
export const updateInvestigationQuotaSettings = async (
  repository: InvestigationQuotaSavedObjectsRepository,
  update: InvestigationQuotasUpdate
): Promise<InvestigationQuotaSettings> =>
  (await applyInvestigationQuotaSettingsUpdate(repository, update)).next;

export const getInvestigationQuotaLedgerId = (date: string, group: InvestigationQuotaGroup) =>
  `${date}-${group}`;

const createEmptyLedger = (
  date: string,
  group: InvestigationQuotaGroup
): NightshiftInvestigationQuotaLedgerAttributes => ({ date, group, count: 0 });

export const readInvestigationQuotaLedger = async (
  repository: InvestigationQuotaSavedObjectsRepository,
  date: string,
  group: InvestigationQuotaGroup
): Promise<NightshiftInvestigationQuotaLedgerAttributes> => {
  try {
    const savedObject = await repository.get<NightshiftInvestigationQuotaLedgerAttributes>(
      NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
      getInvestigationQuotaLedgerId(date, group)
    );
    return savedObject.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return createEmptyLedger(date, group);
    }
    throw error;
  }
};

export interface InvestigationQuotaLedgerMutationResult<Result> {
  /** The new count. Leave it out to keep the ledger as it is. */
  count?: number;
  result: Result;
}

/** Applies the mutation to the latest ledger, retrying when a concurrent update wins. */
export const mutateInvestigationQuotaLedger = async <Result>({
  repository,
  date,
  group,
  mutation,
}: {
  repository: InvestigationQuotaSavedObjectsRepository;
  date: string;
  group: InvestigationQuotaGroup;
  mutation: (
    current: NightshiftInvestigationQuotaLedgerAttributes
  ) => InvestigationQuotaLedgerMutationResult<Result>;
}): Promise<Result> => {
  const id = getInvestigationQuotaLedgerId(date, group);

  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let currentSavedObject: SavedObject<NightshiftInvestigationQuotaLedgerAttributes> | undefined;

    try {
      currentSavedObject = await repository.get<NightshiftInvestigationQuotaLedgerAttributes>(
        NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
        id
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw error;
      }
    }

    const current = currentSavedObject
      ? currentSavedObject.attributes
      : createEmptyLedger(date, group);
    const { count, result } = mutation(current);
    if (count === undefined) {
      return result;
    }
    const next: NightshiftInvestigationQuotaLedgerAttributes = { date, group, count };

    try {
      if (currentSavedObject) {
        await repository.update<NightshiftInvestigationQuotaLedgerAttributes>(
          NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
          id,
          next,
          { version: currentSavedObject.version }
        );
      } else {
        await repository.create<NightshiftInvestigationQuotaLedgerAttributes>(
          NIGHTSHIFT_INVESTIGATION_QUOTA_LEDGER_SO_TYPE,
          next,
          { id, overwrite: false }
        );
      }
      return result;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }
    }
  }

  throw new Error('Investigation quota ledger could not be updated after repeated conflicts');
};
