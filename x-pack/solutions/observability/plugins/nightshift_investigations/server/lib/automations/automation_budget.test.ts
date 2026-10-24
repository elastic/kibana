/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { NightshiftAutomationBudgetAttributes } from './types';
import {
  consumeAutomationBudget,
  hasAutomationBudget,
  readAutomationUsage,
} from './automation_budget';

const createRepository = () => {
  const documents = new Map<
    string,
    { attributes: NightshiftAutomationBudgetAttributes; version: number }
  >();
  const soClient = savedObjectsClientMock.create();
  soClient.get.mockImplementation(async (type, id) => {
    const document = documents.get(id);
    if (!document) throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    return {
      id,
      type,
      references: [],
      attributes: { ...document.attributes },
      version: String(document.version),
    };
  });
  soClient.create.mockImplementation(async (type, attributes, options) => {
    const id = options?.id ?? '';
    if (documents.has(id)) throw SavedObjectsErrorHelpers.createConflictError(type, id);
    documents.set(id, {
      attributes: { ...(attributes as NightshiftAutomationBudgetAttributes) },
      version: 1,
    });
    return { id, type, references: [], attributes, version: '1' };
  });
  soClient.update.mockImplementation(async (type, id, attributes, options) => {
    const current = documents.get(id);
    if (!current) throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    if (options?.version !== String(current.version))
      throw SavedObjectsErrorHelpers.createConflictError(type, id);
    const next = {
      attributes: { ...current.attributes, ...attributes },
      version: current.version + 1,
    };
    documents.set(id, next);
    return { id, type, references: [], attributes: next.attributes, version: String(next.version) };
  });
  return soClient;
};

describe('automation daily dispatch budget', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-10-19T23:59:00.000Z')));
  afterEach(() => jest.useRealTimers());

  it('reports whether budget is left without using any', async () => {
    const repository = createRepository();

    expect(await hasAutomationBudget(repository, 'a1', undefined)).toBe(true);
    expect(await hasAutomationBudget(repository, 'a1', 1)).toBe(true);
    await consumeAutomationBudget(repository, 'a1', 1);
    expect(await hasAutomationBudget(repository, 'a1', 1)).toBe(false);
    expect(await hasAutomationBudget(repository, 'a1', undefined)).toBe(true);
    expect(await readAutomationUsage(repository, 'a1')).toBe(1);
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
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(true);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(false);
    jest.setSystemTime(new Date('2026-10-20T00:00:00.000Z'));
    expect(await readAutomationUsage(repository, 'a1')).toBe(0);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(true);
    expect(await readAutomationUsage(repository, 'a1')).toBe(1);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('keeps automations independent and applies an edited limit to existing usage', async () => {
    const repository = createRepository();
    expect(await readAutomationUsage(repository, 'a1')).toBe(0);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(true);
    expect(await consumeAutomationBudget(repository, 'a1', 1)).toBe(false);
    expect(await consumeAutomationBudget(repository, 'a2', 1)).toBe(true);
    expect(await consumeAutomationBudget(repository, 'a1', 2)).toBe(true);
    expect(await consumeAutomationBudget(repository, 'a1', 2)).toBe(false);
  });

  it('allows an omitted limit while recording usage and treats zero as no dispatches', async () => {
    const repository = createRepository();
    expect(await consumeAutomationBudget(repository, 'a1', undefined)).toBe(true);
    expect(await consumeAutomationBudget(repository, 'a1', undefined)).toBe(true);
    expect(await readAutomationUsage(repository, 'a1')).toBe(2);
    expect(await consumeAutomationBudget(repository, 'a2', 0)).toBe(false);
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
