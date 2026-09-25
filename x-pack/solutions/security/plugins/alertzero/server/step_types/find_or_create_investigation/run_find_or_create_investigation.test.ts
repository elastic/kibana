/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createConversationAlreadyExistsError } from '@kbn/agent-builder-common';
import { buildHuntInvestigationConversationId } from '../../services/watches/hunt/common/hunt_investigation_id';
import { runFindOrCreateInvestigation } from './run_find_or_create_investigation';
import type { FindOrCreateConversationClient } from './run_find_or_create_investigation';

const reportId = 'rpt-find-or-create-1';
const conversationId = buildHuntInvestigationConversationId(reportId);

const buildClient = (
  overrides: Partial<FindOrCreateConversationClient> = {}
): FindOrCreateConversationClient => ({
  create: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue({ id: conversationId }),
  ...overrides,
});

describe('runFindOrCreateInvestigation', () => {
  it('creates a new Investigation and returns its deterministic id', async () => {
    const conversationClient = buildClient();

    const output = await runFindOrCreateInvestigation({ reportId }, { conversationClient });

    expect(output).toEqual({ investigationConversationId: conversationId });
    expect(conversationClient.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: conversationId, rounds: [] })
    );
    expect(conversationClient.get).not.toHaveBeenCalled();
  });

  it('treats a verified 409 as success', async () => {
    const conversationClient = buildClient({
      create: jest
        .fn()
        .mockRejectedValue(createConversationAlreadyExistsError({ conversationId })),
    });

    const output = await runFindOrCreateInvestigation({ reportId }, { conversationClient });

    expect(output).toEqual({ investigationConversationId: conversationId });
    expect(conversationClient.get).toHaveBeenCalledWith(conversationId);
  });

  it('rethrows an unrelated create failure without verifying', async () => {
    const conversationClient = buildClient({
      create: jest.fn().mockRejectedValue(new Error('boom')),
    });

    await expect(
      runFindOrCreateInvestigation({ reportId }, { conversationClient })
    ).rejects.toThrow('boom');
    expect(conversationClient.get).not.toHaveBeenCalled();
  });

  it('rethrows when the verify-read fails after a verified 409', async () => {
    const conversationClient = buildClient({
      create: jest
        .fn()
        .mockRejectedValue(createConversationAlreadyExistsError({ conversationId })),
      get: jest.fn().mockRejectedValue(new Error('not found')),
    });

    await expect(
      runFindOrCreateInvestigation({ reportId }, { conversationClient })
    ).rejects.toThrow('not found');
  });
});
