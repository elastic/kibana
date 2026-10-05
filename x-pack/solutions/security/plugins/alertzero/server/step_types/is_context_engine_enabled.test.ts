/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { makeIsContextEngineEnabled } from './is_context_engine_enabled';

const coreStartWith = (settingValue: boolean) => {
  const coreStart = coreMock.createStart();
  coreStart.uiSettings.asScopedToClient.mockReturnValue({
    get: jest.fn().mockResolvedValue(settingValue),
  } as unknown as ReturnType<CoreStart['uiSettings']['asScopedToClient']>);
  return coreStart;
};

describe('makeIsContextEngineEnabled', () => {
  let request: KibanaRequest;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
  });

  it.each([true, false])('reports the setting value (%s)', async (value) => {
    const isEnabled = makeIsContextEngineEnabled(() => coreStartWith(value));

    await expect(isEnabled(request)).resolves.toBe(value);
  });

  it('reads the Context Engine setting, scoped to the request', async () => {
    const coreStart = coreStartWith(true);
    const scopedClient = { get: jest.fn().mockResolvedValue(true) };
    coreStart.uiSettings.asScopedToClient.mockReturnValue(
      scopedClient as unknown as ReturnType<CoreStart['uiSettings']['asScopedToClient']>
    );

    await makeIsContextEngineEnabled(() => coreStart)(request);

    // Scoping through the request's own saved objects client is what makes the answer
    // space-specific; a Context Engine enabled in one space says nothing about another.
    expect(coreStart.savedObjects.getScopedClient).toHaveBeenCalledWith(request);
    expect(scopedClient.get).toHaveBeenCalledWith(CONTEXT_ENGINE_ENABLED_SETTING_ID);
  });

  // Surfacing the plugin's own `requireStarted` error keeps "not started yet" distinct from
  // "the Context Engine is off": the caller skips coverage either way, but reports the first
  // as a storage failure rather than claiming the deployment turned the feature off.
  it('propagates the not-started error instead of reporting disabled', async () => {
    const isEnabled = makeIsContextEngineEnabled(() => {
      throw new Error('CoreStart is not available until the AlertZero plugin has started');
    });

    await expect(isEnabled(request)).rejects.toThrow('not available until');
  });

  it('reads CoreStart lazily, so registering during setup still sees a later start', async () => {
    const getCoreStart = jest.fn<CoreStart, []>().mockImplementation(() => {
      throw new Error('not started');
    });
    const isEnabled = makeIsContextEngineEnabled(getCoreStart);

    await expect(isEnabled(request)).rejects.toThrow('not started');

    getCoreStart.mockReturnValue(coreStartWith(true));

    await expect(isEnabled(request)).resolves.toBe(true);
  });
});
