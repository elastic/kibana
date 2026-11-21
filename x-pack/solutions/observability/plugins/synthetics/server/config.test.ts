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

const BOTH_PRESENT_MESSAGE =
  'Setting "xpack.uptime" has been replaced by "xpack.synthetics". However, both are present. Settings in "xpack.synthetics" take precedence over "xpack.uptime"';

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
  it('moves xpack.uptime settings to xpack.synthetics', () => {
    const { messages, migrated } = applySyntheticsDeprecations({
      xpack: {
        uptime: {
          enabled: false,
          index: 'heartbeat-*',
          service: {
            username: 'user',
            hosts: ['https://a', 'https://b'],
            tls: { certificate: 'crt', key: 'key' },
          },
        },
      },
    });

    expect(migrated).toEqual({
      xpack: {
        synthetics: {
          enabled: false,
          index: 'heartbeat-*',
          service: {
            username: 'user',
            hosts: ['https://a', 'https://b'],
            tls: { certificate: 'crt', key: 'key' },
          },
        },
      },
    });
    expect(messages).toEqual(['Setting "xpack.uptime" has been replaced by "xpack.synthetics"']);
  });

  it('keeps non-conflicting legacy settings when both namespaces are set', () => {
    const { messages, migrated } = applySyntheticsDeprecations({
      xpack: {
        uptime: { service: { manifestUrl: 'https://manifest', tls: { key: 'legacy-key' } } },
        synthetics: { service: { tls: { certificate: 'crt', key: 'key' } } },
      },
    });

    expect(migrated).toEqual({
      xpack: {
        synthetics: {
          service: {
            manifestUrl: 'https://manifest',
            tls: { certificate: 'crt', key: 'key' },
          },
        },
      },
    });
    expect(messages).toEqual([BOTH_PRESENT_MESSAGE]);
  });

  it('prefers the xpack.synthetics value when a setting is in both namespaces', () => {
    const { messages, migrated } = applySyntheticsDeprecations({
      xpack: {
        uptime: { service: { manifestUrl: 'legacy' } },
        synthetics: { service: { manifestUrl: 'new' } },
      },
    });

    expect(migrated).toEqual({ xpack: { synthetics: { service: { manifestUrl: 'new' } } } });
    expect(messages).toEqual([BOTH_PRESENT_MESSAGE]);
  });

  it('replaces arrays instead of merging them by index', () => {
    const { migrated } = applySyntheticsDeprecations({
      xpack: {
        uptime: { service: { hosts: ['https://a', 'https://b', 'https://c'] } },
        synthetics: { service: { hosts: ['https://x'] } },
      },
    });

    expect(migrated).toEqual({ xpack: { synthetics: { service: { hosts: ['https://x'] } } } });
  });

  it('flags unused keys under the migrated namespace', () => {
    const { messages } = applySyntheticsDeprecations({
      xpack: { uptime: { experimental: { ccs: { enabled: true } } } },
    });

    expect(messages).toEqual(
      expect.arrayContaining([expect.stringContaining('xpack.synthetics.experimental.ccs.enabled')])
    );
  });

  it('does not log anything when only xpack.synthetics is used', () => {
    const { messages, migrated } = applySyntheticsDeprecations({
      xpack: { synthetics: { enabled: true } },
    });

    expect(messages).toEqual([]);
    expect(migrated).toEqual({ xpack: { synthetics: { enabled: true } } });
  });
});
