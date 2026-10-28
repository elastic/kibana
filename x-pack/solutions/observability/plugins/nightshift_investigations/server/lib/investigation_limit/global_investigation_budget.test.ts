/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { InvestigationQuotaDeniedError } from '../../client/errors';
import { createBudgetRepository } from '../automations/automation_budget.mock';
import {
  createGlobalInvestigationBudget,
  readInvestigationLimit,
  readInvestigationUsage,
  writeInvestigationLimit,
} from './global_investigation_budget';

describe('global investigation budget', () => {
  it('denies the start once the limit is reached', async () => {
    const repository = createBudgetRepository();
    await createGlobalInvestigationBudget(repository, 1).consume();

    await expect(createGlobalInvestigationBudget(repository, 1).consume()).rejects.toBeInstanceOf(
      InvestigationQuotaDeniedError
    );
    expect(await readInvestigationUsage(repository)).toBe(1);
  });

  it('is unlimited without a limit', async () => {
    const repository = createBudgetRepository();
    for (let i = 0; i < 5; i++) {
      await createGlobalInvestigationBudget(repository, undefined).consume();
    }

    expect(await readInvestigationUsage(repository)).toBe(5);
  });

  it('releases only what the start charged', async () => {
    const repository = createBudgetRepository();
    await createGlobalInvestigationBudget(repository, 5).consume();
    const budget = createGlobalInvestigationBudget(repository, 5);

    await budget.release();
    expect(await readInvestigationUsage(repository)).toBe(1);

    await budget.consume();
    await budget.release();
    await budget.release();
    expect(await readInvestigationUsage(repository)).toBe(1);
  });
});

describe('investigation limit setting', () => {
  it('reads no limit when none is stored', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.get.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('t', 'id'));

    expect(await readInvestigationLimit(soClient)).toBeUndefined();
  });

  it('creates the setting when it does not exist, then deletes it to remove the limit', async () => {
    const soClient = savedObjectsClientMock.create();
    soClient.update.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError('t', 'id')
    );

    await writeInvestigationLimit(soClient, 3);
    expect(soClient.create).toHaveBeenCalledWith(
      'nightshift-investigation-limit',
      { limit: 3 },
      expect.objectContaining({ id: 'global' })
    );

    await writeInvestigationLimit(soClient, undefined);
    expect(soClient.delete).toHaveBeenCalledWith('nightshift-investigation-limit', 'global');
  });
});
