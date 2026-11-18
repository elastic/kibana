/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ALERTZERO_PROPOSAL_ORIGIN } from '../../../../../common/proposals/origin';
import { createOpenProposalChecker } from './check_open_proposals';

const request = {} as KibanaRequest;

const checker = (list: jest.Mock, logger?: ReturnType<typeof loggingSystemMock.createLogger>) =>
  createOpenProposalChecker({
    proposalsService: { list } as never,
    spaceId: 'test-space',
    request,
    logger,
  });

describe('createOpenProposalChecker', () => {
  it('queries pending and executing, scoped to conversation, space and origin', async () => {
    const list = jest.fn().mockResolvedValue({ proposals: [], total: 0 });

    expect(await checker(list)('conv-1')).toBe(false);

    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv-1',
        origin: ALERTZERO_PROPOSAL_ORIGIN,
        status: 'pending',
        excludeSuperseded: true,
        excludeExpired: true,
      }),
      'test-space',
      request
    );
    // An executing Proposal keeps running past its original decision deadline.
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'executing', excludeExpired: false }),
      'test-space',
      request
    );
  });

  it('returns true when a Proposal is pending, without querying further', async () => {
    const list = jest.fn().mockResolvedValue({ proposals: [], total: 1 });
    expect(await checker(list)('conv-1')).toBe(true);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('returns true when only an executing Proposal exists', async () => {
    const list = jest
      .fn()
      .mockResolvedValueOnce({ proposals: [], total: 0 })
      .mockResolvedValueOnce({ proposals: [], total: 1 });
    expect(await checker(list)('conv-1')).toBe(true);
  });

  it('logs and rethrows on a lookup failure', async () => {
    const logger = loggingSystemMock.createLogger();
    const error = new Error('proposals index unavailable');
    await expect(checker(jest.fn().mockRejectedValue(error), logger)('conv-1')).rejects.toThrow(
      error
    );
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('conv-1'));
  });
});
