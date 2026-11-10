/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';
import { config } from './config';

const CONFIG_PATH = 'xpack.synthetics';

const deprecationContext = configDeprecationsMock.createContext();

const applySyntheticsDeprecations = (rootConfig: Record<string, unknown>) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const messages: string[] = [];
  const { config: migrated } = applyDeprecations(
    rootConfig,
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        messages.push(message)
  );
  return { messages, migrated };
};

describe('synthetics config deprecations', () => {
  it('renames xpack.uptime to xpack.synthetics', () => {
    const { messages, migrated } = applySyntheticsDeprecations({
      xpack: {
        uptime: {
          enabled: false,
          index: 'heartbeat-*',
          service: { username: 'user', tls: { certificate: 'crt', key: 'key' } },
        },
      },
    });

    expect(migrated).toEqual({
      xpack: {
        synthetics: {
          enabled: false,
          index: 'heartbeat-*',
          service: { username: 'user', tls: { certificate: 'crt', key: 'key' } },
        },
      },
    });
    expect(messages).toEqual(['Setting "xpack.uptime" has been replaced by "xpack.synthetics"']);
  });

  it('flags unused keys under the renamed namespace', () => {
    const { messages } = applySyntheticsDeprecations({
      xpack: { uptime: { experimental: { ccs: { enabled: true } } } },
    });

    expect(messages).toEqual(
      expect.arrayContaining([expect.stringContaining('xpack.synthetics.experimental.ccs.enabled')])
    );
  });

  it('does not log anything when xpack.synthetics is used', () => {
    const { messages, migrated } = applySyntheticsDeprecations({
      xpack: { synthetics: { enabled: true } },
    });

    expect(messages).toEqual([]);
    expect(migrated).toEqual({ xpack: { synthetics: { enabled: true } } });
  });
});
