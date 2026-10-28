/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE } from '../../saved_objects/automation_budget_saved_object';
import { AutomationDailyLimitReachedError } from '../../client/errors';
import type { AutomationBudget } from '../../types';
import type { NightshiftAutomationBudgetAttributes } from './types';

const MAX_OCC_ATTEMPTS = 100;
type BudgetRepository = Pick<SavedObjectsClientContract, 'get' | 'create' | 'update'>;

const today = () => new Date().toISOString().slice(0, 10);

const isConflict = (error: unknown) =>
  error instanceof Error && SavedObjectsErrorHelpers.isConflictError(error);

const readBudget = async (soClient: BudgetRepository, automationId: string) => {
  try {
    return await soClient.get<NightshiftAutomationBudgetAttributes>(
      NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
      automationId
    );
  } catch (error) {
    if (!(error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error))) throw error;
    return undefined;
  }
};

export const readAutomationUsage = async (
  soClient: BudgetRepository,
  automationId: string
): Promise<number> => {
  const budget = await readBudget(soClient, automationId);
  return budget?.attributes.date === today() ? budget.attributes.used : 0;
};

/**
 * Reserve one dispatch before starting an investigation, using optimistic concurrency across Kibana
 * instances. Resolves to the UTC day charged, or undefined when the limit is reached.
 */
export const consumeAutomationBudget = async (
  soClient: BudgetRepository,
  automationId: string,
  dailyLimit: number | undefined
): Promise<string | undefined> => {
  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    const current: SavedObject<NightshiftAutomationBudgetAttributes> | undefined = await readBudget(
      soClient,
      automationId
    );
    const date = today();
    const used = current?.attributes.date === date ? current.attributes.used : 0;
    if (dailyLimit !== undefined && used >= dailyLimit) return undefined;

    const next: NightshiftAutomationBudgetAttributes = { automationId, date, used: used + 1 };
    try {
      if (current) {
        await soClient.update(NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE, automationId, next, {
          version: current.version,
        });
      } else {
        await soClient.create(NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE, next, {
          id: automationId,
          overwrite: false,
        });
      }
      return date;
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }
  throw new Error('Automation budget could not be updated after repeated conflicts');
};

/** Gives back one dispatch charged on `date`. Usage of a later day is left untouched. */
export const releaseAutomationBudget = async (
  soClient: BudgetRepository,
  automationId: string,
  date: string
): Promise<void> => {
  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    const current = await readBudget(soClient, automationId);
    if (!current || current.attributes.date !== date || current.attributes.used === 0) return;

    try {
      await soClient.update(
        NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
        automationId,
        { ...current.attributes, used: current.attributes.used - 1 },
        { version: current.version }
      );
      return;
    } catch (error) {
      if (!isConflict(error)) throw error;
    }
  }
  throw new Error('Automation budget could not be released after repeated conflicts');
};

/** The budget of one automation for one start. Releasing gives back only what this start charged. */
export const createAutomationBudget = (
  soClient: BudgetRepository,
  automationId: string,
  dailyLimit: number | undefined
): AutomationBudget => {
  let chargedDate: string | undefined;
  return {
    consume: async () => {
      chargedDate = await consumeAutomationBudget(soClient, automationId, dailyLimit);
      if (!chargedDate) {
        throw new AutomationDailyLimitReachedError(dailyLimit);
      }
    },
    release: async () => {
      if (!chargedDate) return;
      const date = chargedDate;
      chargedDate = undefined;
      await releaseAutomationBudget(soClient, automationId, date);
    },
  };
};
