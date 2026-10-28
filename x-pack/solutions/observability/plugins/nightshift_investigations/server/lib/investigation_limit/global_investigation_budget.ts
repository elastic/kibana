/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { InvestigationQuotaDeniedError } from '../../client/errors';
import type { AutomationBudget } from '../../types';
import {
  NIGHTSHIFT_INVESTIGATION_LIMIT_SO_ID,
  NIGHTSHIFT_INVESTIGATION_LIMIT_SO_TYPE,
  type NightshiftInvestigationLimitAttributes,
} from '../../saved_objects/investigation_limit_saved_object';
import {
  consumeAutomationBudget,
  readAutomationUsage,
  releaseAutomationBudget,
} from '../automations/automation_budget';

export const GLOBAL_INVESTIGATION_BUDGET_ID = 'global-investigation-budget';

type LimitRepository = Pick<SavedObjectsClientContract, 'get' | 'create' | 'update' | 'delete'>;

export const readInvestigationLimit = async (
  soClient: LimitRepository
): Promise<number | undefined> => {
  try {
    const { attributes } = await soClient.get<NightshiftInvestigationLimitAttributes>(
      NIGHTSHIFT_INVESTIGATION_LIMIT_SO_TYPE,
      NIGHTSHIFT_INVESTIGATION_LIMIT_SO_ID
    );
    return attributes.limit;
  } catch (error) {
    if (!(error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error))) throw error;
    return undefined;
  }
};

export const writeInvestigationLimit = async (
  soClient: LimitRepository,
  limit: number | undefined
): Promise<void> => {
  try {
    if (limit === undefined) {
      await soClient.delete(
        NIGHTSHIFT_INVESTIGATION_LIMIT_SO_TYPE,
        NIGHTSHIFT_INVESTIGATION_LIMIT_SO_ID
      );
      return;
    }
    await soClient.update(
      NIGHTSHIFT_INVESTIGATION_LIMIT_SO_TYPE,
      NIGHTSHIFT_INVESTIGATION_LIMIT_SO_ID,
      { limit }
    );
  } catch (error) {
    if (!(error instanceof Error && SavedObjectsErrorHelpers.isNotFoundError(error))) throw error;
    if (limit === undefined) return;
    await soClient.create(
      NIGHTSHIFT_INVESTIGATION_LIMIT_SO_TYPE,
      { limit },
      { id: NIGHTSHIFT_INVESTIGATION_LIMIT_SO_ID, overwrite: true }
    );
  }
};

export const readInvestigationUsage = (soClient: LimitRepository): Promise<number> =>
  readAutomationUsage(soClient, GLOBAL_INVESTIGATION_BUDGET_ID);

export const createGlobalInvestigationBudget = (
  soClient: LimitRepository,
  limit: number | undefined
): AutomationBudget => {
  let chargedDate: string | undefined;
  return {
    consume: async () => {
      chargedDate = await consumeAutomationBudget(soClient, GLOBAL_INVESTIGATION_BUDGET_ID, limit);
      if (!chargedDate) {
        throw new InvestigationQuotaDeniedError();
      }
    },
    release: async () => {
      if (!chargedDate) return;
      const date = chargedDate;
      chargedDate = undefined;
      await releaseAutomationBudget(soClient, GLOBAL_INVESTIGATION_BUDGET_ID, date);
    },
  };
};
