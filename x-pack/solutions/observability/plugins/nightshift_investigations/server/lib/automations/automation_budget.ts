/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE } from '../../saved_objects/automation_budget_saved_object';
import type { NightshiftAutomationBudgetAttributes } from './types';

const MAX_OCC_ATTEMPTS = 100;
type BudgetRepository = Pick<SavedObjectsClientContract, 'get' | 'create' | 'update'>;

const readBudget = async (soClient: BudgetRepository, automationId: string) => {
  try {
    return await soClient.get<NightshiftAutomationBudgetAttributes>(
      NIGHTSHIFT_AUTOMATION_BUDGET_SO_TYPE,
      automationId
    );
  } catch (error) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) throw error;
    return undefined;
  }
};

export const readAutomationUsage = async (
  soClient: BudgetRepository,
  automationId: string
): Promise<number> => {
  const budget = await readBudget(soClient, automationId);
  return budget?.attributes.date === new Date().toISOString().slice(0, 10)
    ? budget.attributes.used
    : 0;
};

/** Reserve one dispatch before starting an investigation, using optimistic concurrency across Kibana instances. */
export const consumeAutomationBudget = async (
  soClient: BudgetRepository,
  automationId: string,
  dailyLimit: number | undefined
): Promise<boolean> => {
  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    const current: SavedObject<NightshiftAutomationBudgetAttributes> | undefined = await readBudget(
      soClient,
      automationId
    );
    const date = new Date().toISOString().slice(0, 10);
    const used = current?.attributes.date === date ? current.attributes.used : 0;
    if (dailyLimit !== undefined && used >= dailyLimit) return false;

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
      return true;
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) throw error;
    }
  }
  throw new Error('Automation budget could not be updated after repeated conflicts');
};
