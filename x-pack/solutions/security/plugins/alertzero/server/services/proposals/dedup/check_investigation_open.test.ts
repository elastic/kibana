/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createConversationNotFoundError } from '@kbn/agent-builder-common';
import { createInvestigationOpenChecker } from './check_investigation_open';

const checker = (get: jest.Mock) => {
  const logger = loggerMock.create();
  return {
    logger,
    isOpen: createInvestigationOpenChecker({ conversationClient: { get }, logger }),
  };
};

describe('createInvestigationOpenChecker', () => {
  it('reads an Investigation whose status is open as open', async () => {
    const { isOpen } = checker(jest.fn().mockResolvedValue({ metadata: { status: 'open' } }));

    await expect(isOpen('conv-1')).resolves.toBe(true);
  });

  it.each([[undefined], [{}], [{ status: '' }]])(
    'reads an absent or empty status (%j) as open, as everything else does',
    async (metadata) => {
      const { isOpen } = checker(jest.fn().mockResolvedValue({ metadata }));

      await expect(isOpen('conv-1')).resolves.toBe(true);
    }
  );

  it('reads a closed Investigation as not open: nobody can be shown a proposal on it', async () => {
    const { isOpen } = checker(jest.fn().mockResolvedValue({ metadata: { status: 'closed' } }));

    await expect(isOpen('conv-1')).resolves.toBe(false);
  });

  it('reads an Investigation that is gone, or that the request cannot read, as not open', async () => {
    const get = jest
      .fn()
      .mockRejectedValue(createConversationNotFoundError({ conversationId: 'conv-1' }));
    const { isOpen } = checker(get);

    await expect(isOpen('conv-1')).resolves.toBe(false);
  });

  it('logs and throws any other failure, so the caller can retry or fail closed', async () => {
    const get = jest.fn().mockRejectedValue(new Error('cluster unavailable'));
    const { isOpen, logger } = checker(get);

    await expect(isOpen('conv-1')).rejects.toThrow('cluster unavailable');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));
  });

  it('asks once per Investigation, however many proposals it owns', async () => {
    const get = jest.fn().mockResolvedValue({ metadata: { status: 'closed' } });
    const { isOpen } = checker(get);

    await isOpen('conv-1');
    await isOpen('conv-1');
    await isOpen('conv-2');

    expect(get.mock.calls.map(([id]) => id)).toEqual(['conv-1', 'conv-2']);
  });

  it('does not remember a failure, so a retry asks again', async () => {
    const get = jest
      .fn()
      .mockRejectedValueOnce(new Error('blip'))
      .mockResolvedValue({ metadata: { status: 'open' } });
    const { isOpen } = checker(get);

    await expect(isOpen('conv-1')).rejects.toThrow('blip');
    await expect(isOpen('conv-1')).resolves.toBe(true);
  });
});
