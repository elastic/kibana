/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { loggingSystemMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';
import { NativeVulnScannerPlugin } from './plugin';
import { ensureFindingsIndex } from './lib/findings';

jest.mock('./lib/findings', () => ({ ensureFindingsIndex: jest.fn() }));

const ensureMock = ensureFindingsIndex as jest.MockedFunction<typeof ensureFindingsIndex>;

const startPlugin = async (enabled: boolean) => {
  const context = coreMock.createPluginInitializerContext({ enabled });
  const plugin = new NativeVulnScannerPlugin(context);
  plugin.setup();
  const core = coreMock.createStart();
  plugin.start(core);
  await new Promise(process.nextTick);
  return {
    core,
    logger: context.logger.get() as ReturnType<typeof loggingSystemMock.createLogger>,
  };
};

describe('NativeVulnScannerPlugin', () => {
  beforeEach(() => ensureMock.mockReset());

  it('sets up the findings index as the internal user when enabled', async () => {
    ensureMock.mockResolvedValue();
    const { core } = await startPlugin(true);
    expect(ensureMock).toHaveBeenCalledWith(core.elasticsearch.client.asInternalUser);
  });

  it('touches nothing when disabled', async () => {
    await startPlugin(false);
    expect(ensureMock).not.toHaveBeenCalled();
  });

  it('logs instead of failing start when the index setup fails', async () => {
    ensureMock.mockRejectedValue(new Error('boom'));
    const { logger } = await startPlugin(true);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
