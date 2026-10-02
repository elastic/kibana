/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { releaseFpOpenPointerStepDefinition } from './release_fp_open_pointer';
import { createStepContext, storedPointer } from './test_helpers';

const mockStore = { get: jest.fn(), write: jest.fn(), release: jest.fn() };
jest.mock('../rule_dispositions/fp_open_pointer_store', () => ({
  createFpOpenPointerStore: () => mockStore,
}));

const INPUT = { rule_id: 'rule-1', conversation_id: 'conv-standing' };

const setup = ({ isPointerStoreAvailable = true } = {}) => {
  const { context } = createStepContext(INPUT);
  const run = () =>
    releaseFpOpenPointerStepDefinition({ isPointerStoreAvailable }).handler(context);
  return { run };
};

describe('releaseFpOpenPointerStepDefinition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.get.mockResolvedValue(storedPointer());
    mockStore.release.mockResolvedValue('released');
  });

  it('does nothing without the Context Engine', async () => {
    const { run } = setup({ isPointerStoreAvailable: false });

    await expect(run()).resolves.toEqual({ output: { released: false } });
    expect(mockStore.get).not.toHaveBeenCalled();
  });

  it('removes the pointer that still leads to the settled Investigation, as read', async () => {
    const { run } = setup();

    await expect(run()).resolves.toEqual({ output: { released: true } });
    expect(mockStore.release).toHaveBeenCalledWith('rule-1', storedPointer());
  });

  it('leaves a pointer that already leads to a newer proposal', async () => {
    mockStore.get.mockResolvedValue(storedPointer({ conversationId: 'conv-newer' }));
    const { run } = setup();

    await expect(run()).resolves.toEqual({ output: { released: false } });
    expect(mockStore.release).not.toHaveBeenCalled();
  });

  it('has nothing to release when the rule has no pointer', async () => {
    mockStore.get.mockResolvedValue(undefined);
    const { run } = setup();

    await expect(run()).resolves.toEqual({ output: { released: false } });
    expect(mockStore.release).not.toHaveBeenCalled();
  });

  it('reports not released when another writer replaced the pointer first', async () => {
    mockStore.release.mockResolvedValue('conflict');
    const { run } = setup();

    await expect(run()).resolves.toEqual({ output: { released: false } });
  });
});
