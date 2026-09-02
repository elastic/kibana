/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { PndClientConfig } from './types';
import { PndPublicPlugin } from './plugin';

const createConfig = (overrides: Partial<PndClientConfig> = {}): PndClientConfig => ({
  enabled: false,
  ui: { useMockData: true },
  ...overrides,
});

const createContext = (config: PndClientConfig) =>
  ({
    config: { get: () => config },
  } as unknown as ConstructorParameters<typeof PndPublicPlugin>[0]);

describe('PndPublicPlugin feature-flag gating', () => {
  it('does not register the browser app when disabled', () => {
    const plugin = new PndPublicPlugin(createContext(createConfig({ enabled: false })));
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup as never, {} as never);

    expect(coreSetup.application.register).not.toHaveBeenCalled();
  });

  it('registers the browser app when enabled', () => {
    const plugin = new PndPublicPlugin(createContext(createConfig({ enabled: true })));
    const coreSetup = coreMock.createSetup();

    plugin.setup(coreSetup as never, {} as never);

    expect(coreSetup.application.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pnd', appRoute: '/app/pnd' })
    );
  });
});
