/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../../common/proposals/origin';
import { createExistingProposalsCounter } from './check_existing_proposals';

const request = {} as KibanaRequest;

describe('createExistingProposalsCounter', () => {
  it('scopes the lookup to this conversation, this space, and the alertzero origin', async () => {
    const list = jest.fn().mockResolvedValue({ proposals: [], total: 0 });
    const counter = createExistingProposalsCounter({
      proposalsService: { list } as never,
      spaceId: 'test-space',
      request,
    });

    await counter('conv-1');

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        origin: ALERTZERO_PROPOSAL_ORIGIN,
        // Every Proposal counted, including a superseded or expired one: an "existing"
        // Proposal for this guard does not mean an open one.
        excludeSuperseded: false,
        excludeExpired: false,
      }),
      'test-space',
      request
    );
  });

  it('returns the total when at least one Proposal exists', async () => {
    const counter = createExistingProposalsCounter({
      proposalsService: { list: jest.fn().mockResolvedValue({ proposals: [], total: 3 }) } as never,
      spaceId: 'default',
      request,
    });

    expect(await counter('conv-1')).toBe(3);
  });

  it('returns 0 when no Proposal exists', async () => {
    const counter = createExistingProposalsCounter({
      proposalsService: { list: jest.fn().mockResolvedValue({ proposals: [], total: 0 }) } as never,
      spaceId: 'default',
      request,
    });

    expect(await counter('conv-1')).toBe(0);
  });

  it('logs and rethrows on a lookup failure, rather than swallowing it', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error('proposals index unavailable');
    const counter = createExistingProposalsCounter({
      proposalsService: { list: jest.fn().mockRejectedValue(error) } as never,
      spaceId: 'default',
      request,
      logger,
    });

    await expect(counter('conv-1')).rejects.toThrow(error);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('proposals index unavailable')
    );
  });
});
