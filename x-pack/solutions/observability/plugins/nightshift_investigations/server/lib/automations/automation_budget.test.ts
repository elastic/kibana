/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { AutomationDailyLimitReachedError } from '../../client/errors';
import {
  consumeAutomationBudget,
  createAutomationBudget,
  readAutomationUsage,
  releaseAutomationBudget,
} from './automation_budget';
import { createBudgetRepository as createRepository } from './automation_budget.mock';

const TODAY = '2026-10-19';
const TOMORROW = '2026-10-20';

describe('automation daily dispatch budget', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-10-19T23:59:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('releases one dispatch of the day it was charged', async () => {
    const repository = createRepository();
    await consumeAutomationBudget(repository, 'a1', 2);
    await consumeAutomationBudget(repository, 'a1', 2);

    await releaseAutomationBudget(repository, 'a1', TODAY);

    expect(await readAutomationUsage(repository, 'a1')).toBe(1);
  });

  it('leaves usage untouched when releasing a charge of an earlier day or with nothing used', async () => {
    const repository = createRepository();
    await releaseAutomationBudget(repository, 'a1', TODAY);
    expect(repository.update).not.toHaveBeenCalled();

    await consumeAutomationBudget(repository, 'a1', 1);
    jest.setSystemTime(new Date(`${TOMORROW}T00:00:00.000Z`));
    await consumeAutomationBudget(repository, 'a1', 1);
    await releaseAutomationBudget(repository, 'a1', TODAY);

    expect(await readAutomationUsage(repository, 'a1')).toBe(1);
  });

  it('releases only what the start charged, once', async () => {
    const repository = createRepository();
    await consumeAutomationBudget(repository, 'a1', 2);
    const budget = createAutomationBudget(repository, 'a1', 2);

    await budget.release();
    expect(await readAutomationUsage(repository, 'a1')).toBe(1);

    await budget.consume();
    await budget.release();
    await budget.release();
    expect(await readAutomationUsage(repository, 'a1')).toBe(1);
  });

  it('denies a start over the limit without charging it', async () => {
    const repository = createRepository();
    const budget = createAutomationBudget(repository, 'a1', 0);

    await expect(budget.consume()).rejects.toBeInstanceOf(AutomationDailyLimitReachedError);
    await budget.release();

    expect(await readAutomationUsage(repository, 'a1')).toBe(0);
  });

  it('admits exactly the limit under concurrent first creates and updates', async () => {
    const repository = createRepository();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumeAutomationBudget(repository, 'a1', 5))
    );
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await readAutomationUsage(repository, 'a1')).toBe(5);
    expect(repository.create).toHaveBeenCalledWith(
      'nightshift-automation-budget',
      expect.any(Object),
      { id: 'a1', overwrite: false }
    );
    expect(repository.update).toHaveBeenCalledWith(
      'nightshift-automation-budget',
      'a1',
      expect.any(Object),
      { version: expect.any(String) }
    );
  });

  it('resets usage at midnight UTC and reuses the same document', async () => {
    const repository = createRepository();
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(TODAY);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBeUndefined();
    jest.setSystemTime(new Date(`${TOMORROW}T00:00:00.000Z`));
    expect(await readAutomationUsage(repository, 'a1')).toBe(0);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(TOMORROW);
    expect(await readAutomationUsage(repository, 'a1')).toBe(1);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('keeps automations independent and applies an edited limit to existing usage', async () => {
    const repository = createRepository();
    expect(await readAutomationUsage(repository, 'a1')).toBe(0);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(TODAY);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBeUndefined();
    expect(await consumeAutomationBudget(repository, 'a2', 1)).toBe(TODAY);
    expect(await consumeAutomationBudget(repository, 'a1', 2)).toBe(TODAY);
    expect(await consumeAutomationBudget(repository, 'a1', 2)).toBeUndefined();
  });

  it('allows an omitted limit while recording usage and treats zero as no dispatches', async () => {
    const repository = createRepository();
    expect(await consumeAutomationBudget(repository, 'a1', undefined)).toBe(TODAY);
    expect(await consumeAutomationBudget(repository, 'a1', undefined)).toBe(TODAY);
    expect(await readAutomationUsage(repository, 'a1')).toBe(2);
    expect(await consumeAutomationBudget(repository, 'a2', 0)).toBeUndefined();
    expect(await readAutomationUsage(repository, 'a2')).toBe(0);
  });

  it('fails closed on read or write errors rather than allowing uncounted starts', async () => {
    const repository = createRepository();
    const error = new Error('Storage unavailable');
    repository.get.mockRejectedValueOnce(error);
    await expect(consumeAutomationBudget(repository, 'a1', 1)).rejects.toBe(error);
    repository.create.mockRejectedValueOnce(error);
    await expect(consumeAutomationBudget(repository, 'a1', 1)).rejects.toBe(error);
    expect(await readAutomationUsage(repository, 'a1')).toBe(0);
  });

  it('stops retrying if another writer keeps conflicting', async () => {
    const repository = createRepository();
    repository.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError('budget', 'a1')
    );
    await expect(consumeAutomationBudget(repository, 'a1', 1)).rejects.toThrow(
      'repeated conflicts'
    );
    expect(repository.create).toHaveBeenCalledTimes(100);
  });
});
