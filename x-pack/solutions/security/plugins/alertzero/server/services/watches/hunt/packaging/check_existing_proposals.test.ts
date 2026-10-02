/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../../common/proposals/origin';
import { createExistingProposalsChecker } from './check_existing_proposals';

const request = {} as KibanaRequest;

describe('createExistingProposalsChecker', () => {
  it('scopes the lookup to this conversation, this space, and the alertzero origin', async () => {
    const list = jest.fn().mockResolvedValue({ proposals: [], total: 0 });
    const checker = createExistingProposalsChecker({
      proposalsService: { list } as never,
      spaceId: 'test-space',
      request,
    });

    await checker('conv-1');

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

  it('returns true when at least one Proposal exists', async () => {
    const checker = createExistingProposalsChecker({
      proposalsService: { list: jest.fn().mockResolvedValue({ proposals: [], total: 3 }) } as never,
      spaceId: 'default',
      request,
    });

    expect(await checker('conv-1')).toBe(true);
  });

  it('returns false when no Proposal exists', async () => {
    const checker = createExistingProposalsChecker({
      proposalsService: { list: jest.fn().mockResolvedValue({ proposals: [], total: 0 }) } as never,
      spaceId: 'default',
      request,
    });

    expect(await checker('conv-1')).toBe(false);
  });

  it('logs and rethrows on a lookup failure, rather than swallowing it', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error('proposals index unavailable');
    const checker = createExistingProposalsChecker({
      proposalsService: { list: jest.fn().mockRejectedValue(error) } as never,
      spaceId: 'default',
      request,
      logger,
    });

    await expect(checker('conv-1')).rejects.toThrow(error);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('proposals index unavailable')
    );
  });
});
