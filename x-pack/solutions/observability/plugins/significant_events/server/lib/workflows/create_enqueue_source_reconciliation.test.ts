/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createEnqueueSourceReconciliation } from './create_enqueue_source_reconciliation';

describe('createEnqueueSourceReconciliation', () => {
  const args = {
    sourceId: 'source-1',
    sourceSlug: 'source-1',
    request: httpServerMock.createKibanaRequest(),
  };

  const setup = ({
    install,
    available = true,
  }: {
    install: Promise<void>;
    available?: boolean;
  }) => {
    const execute = jest.fn(async () => {});
    const enqueue = createEnqueueSourceReconciliation({
      whenInstalled: () => install,
      isAvailable: async () => available,
      execute,
      logger: loggingSystemMock.createLogger(),
    });
    return { enqueue, execute };
  };

  it('waits for the install in flight before running the workflow', async () => {
    let finishInstall!: () => void;
    const { enqueue, execute } = setup({
      install: new Promise<void>((resolve) => {
        finishInstall = resolve;
      }),
    });

    const pending = enqueue(args);
    await Promise.resolve();
    expect(execute).not.toHaveBeenCalled();

    finishInstall();
    await pending;
    expect(execute).toHaveBeenCalledWith(args);
  });

  it('still runs the workflow when the install failed, so the lookup reports the cause', async () => {
    const { enqueue, execute } = setup({ install: Promise.reject(new Error('boom')) });

    await enqueue(args);

    expect(execute).toHaveBeenCalledWith(args);
  });

  it('skips without an error when the feature is unavailable', async () => {
    const { enqueue, execute } = setup({ install: Promise.resolve(), available: false });

    await expect(enqueue(args)).resolves.toBeUndefined();

    expect(execute).not.toHaveBeenCalled();
  });
});
