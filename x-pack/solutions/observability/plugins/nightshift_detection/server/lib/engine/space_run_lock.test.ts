/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { LockAcquisitionError, withLock } from '@kbn/lock-manager';
import { SpaceRunLock } from './space_run_lock';

jest.mock('@kbn/lock-manager', () => ({
  ...jest.requireActual('@kbn/lock-manager'),
  withLock: jest.fn(),
}));

const withLockMock = withLock as jest.MockedFunction<typeof withLock>;

function createLock() {
  return new SpaceRunLock(
    elasticsearchServiceMock.createElasticsearchClient(),
    loggingSystemMock.createLogger()
  );
}

describe('SpaceRunLock', () => {
  beforeEach(() => {
    withLockMock.mockReset();
  });

  it('runs the callback under a lock of its space and returns its result', async () => {
    withLockMock.mockImplementation(async (_options, callback) => callback());

    const outcome = await createLock().run({ spaceId: 'space-a', callback: async () => 42 });

    expect(outcome).toEqual({ ran: true, result: 42 });
    expect(withLockMock).toHaveBeenCalledWith(
      expect.objectContaining({ lockId: 'nightshift-detection:run:space-a' }),
      expect.any(Function)
    );
  });

  it('skips the run when another run holds the space', async () => {
    withLockMock.mockRejectedValue(new LockAcquisitionError('held'));
    const callback = jest.fn();

    expect(await createLock().run({ spaceId: 'space-a', callback })).toEqual({ ran: false });
    expect(callback).not.toHaveBeenCalled();
  });

  it('rethrows a lock error raised by the callback itself', async () => {
    withLockMock.mockImplementation(async (_options, callback) => callback());

    await expect(
      createLock().run({
        spaceId: 'space-a',
        callback: async () => {
          throw new LockAcquisitionError('nested');
        },
      })
    ).rejects.toThrow(LockAcquisitionError);
  });

  it('rethrows any other failure', async () => {
    withLockMock.mockRejectedValue(new Error('boom'));

    await expect(createLock().run({ spaceId: 'space-a', callback: jest.fn() })).rejects.toThrow(
      'boom'
    );
  });
});
