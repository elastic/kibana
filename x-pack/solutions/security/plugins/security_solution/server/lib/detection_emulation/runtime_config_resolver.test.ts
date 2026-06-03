/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';

import {
  DETECTION_EMULATION_ALLOWLIST_ENDPOINT_IDS_SETTING,
  DETECTION_EMULATION_RATE_LIMITER_MAX_COMMANDS_SETTING,
  DETECTION_EMULATION_RATE_LIMITER_PER_HOST_CAPACITY_SETTING,
  DETECTION_EMULATION_RATE_LIMITER_WINDOW_MS_SETTING,
} from '../../../common/constants';
import type { ConfigType } from '../../config';
import { resolveAllowlistConfig, resolveRateLimiterConfig } from './runtime_config_resolver';

const makeLogger = (): Logger => loggingSystemMock.createLogger();

const makeUiSettingsClient = (overrides: Record<string, unknown> = {}): IUiSettingsClient => {
  const get = jest.fn(async (key: string) => {
    if (key in overrides) return overrides[key];
    // Match real `IUiSettingsClient.get`'s behaviour for unset
    // registered keys: returns the registered default (we register
    // `[]` for the allowlist and `0` for the numeric knobs, so callers
    // receive sentinel "fall back to kibana.yml" values by default).
    if (key === DETECTION_EMULATION_ALLOWLIST_ENDPOINT_IDS_SETTING) return [];
    return 0;
  });
  return { get } as unknown as IUiSettingsClient;
};

const makeConfig = (overrides: Partial<ConfigType['detectionEmulation']> = {}): ConfigType =>
  ({
    detectionEmulation: {
      realExecutionEnabled: true,
      allowlist: { allowAll: false, endpointIds: ['kibana-yml-endpoint'] },
      rateLimiter: {
        maxCommands: 50,
        windowMs: 30 * 60 * 1000,
        disabled: false,
        perHost: { capacity: 5, windowMs: 30 * 60 * 1000 },
      },
      ...overrides,
    },
  } as unknown as ConfigType);

describe('runtime_config_resolver', () => {
  describe('resolveAllowlistConfig', () => {
    it('falls back to kibana.yml when the Advanced Setting is unset (empty array sentinel)', async () => {
      const result = await resolveAllowlistConfig({
        uiSettingsClient: makeUiSettingsClient(),
        config: makeConfig(),
        logger: makeLogger(),
      });

      // kibana.yml had `endpointIds: ['kibana-yml-endpoint']`, allowAll: false.
      expect(result).toBeDefined();
      expect(result?.allowAll).toBe(false);
      expect(result && Array.from(result.allowedHosts)).toEqual(['kibana-yml-endpoint']);
    });

    it('returns `undefined` when neither the Advanced Setting nor kibana.yml is set (defer to constructor binding)', async () => {
      // The resolver MUST NOT silently materialise a default-deny shape
      // when both layers are unset — that would clobber the
      // constructor-bound config (whatever the route or test fixture
      // injected). Returning `undefined` lets the caller pass nothing
      // to `validate()`, which preserves the constructor-time behavior.
      const result = await resolveAllowlistConfig({
        uiSettingsClient: makeUiSettingsClient(),
        config: makeConfig({ allowlist: undefined }),
        logger: makeLogger(),
      });

      expect(result).toBeUndefined();
    });

    it('uses the Advanced Setting override and does NOT merge kibana.yml IDs in', async () => {
      // Locks the contract: per-space override wins entirely. Merging
      // would silently leak the kibana.yml allowlist into a space whose
      // operator expected to scope strictly to their own list.
      const result = await resolveAllowlistConfig({
        uiSettingsClient: makeUiSettingsClient({
          [DETECTION_EMULATION_ALLOWLIST_ENDPOINT_IDS_SETTING]: ['ui-only-endpoint'],
        }),
        config: makeConfig(),
        logger: makeLogger(),
      });

      expect(result).toBeDefined();
      expect(result?.allowAll).toBe(false);
      expect(result && Array.from(result.allowedHosts)).toEqual(['ui-only-endpoint']);
    });

    it('falls back to kibana.yml when uiSettings.get throws (unregistered key / space-less request)', async () => {
      const throwingClient = {
        get: jest.fn().mockRejectedValue(new Error('uiSettings unregistered')),
      } as unknown as IUiSettingsClient;

      const result = await resolveAllowlistConfig({
        uiSettingsClient: throwingClient,
        config: makeConfig(),
        logger: makeLogger(),
      });

      expect(result && Array.from(result.allowedHosts)).toEqual(['kibana-yml-endpoint']);
    });

    it('treats a non-array uiSettings response as unset (defensive — schema should prevent this but we never want to silently pass `null` into a Set)', async () => {
      const result = await resolveAllowlistConfig({
        uiSettingsClient: makeUiSettingsClient({
          [DETECTION_EMULATION_ALLOWLIST_ENDPOINT_IDS_SETTING]: null,
        }),
        config: makeConfig(),
        logger: makeLogger(),
      });

      expect(result && Array.from(result.allowedHosts)).toEqual(['kibana-yml-endpoint']);
    });
  });

  describe('resolveRateLimiterConfig', () => {
    it('falls back to kibana.yml when all numeric Advanced Settings are unset (sentinel 0)', async () => {
      const result = await resolveRateLimiterConfig({
        uiSettingsClient: makeUiSettingsClient(),
        config: makeConfig(),
        logger: makeLogger(),
      });

      expect(result).toEqual({
        maxCommands: 50,
        windowMs: 30 * 60 * 1000,
        disabled: false,
        perHost: { capacity: 5, windowMs: 30 * 60 * 1000 },
      });
    });

    it('returns `undefined` when no override exists at any layer (uiSettings + kibana.yml + constructorConfig all absent)', async () => {
      // Symmetric to the allowlist case: the resolver must not
      // synthesize a default config when there's nothing to override.
      // Returning `undefined` lets the caller pass nothing to
      // `acquire()`, preserving the constructor binding.
      const result = await resolveRateLimiterConfig({
        uiSettingsClient: makeUiSettingsClient(),
        config: makeConfig({ rateLimiter: undefined }),
        logger: makeLogger(),
      });

      expect(result).toBeUndefined();
    });

    it('uses constructorConfig as the layered fallback when only a partial uiSettings override is supplied', async () => {
      // Production wiring passes `rateLimiter.getConfig()` as
      // `constructorConfig`. Locks the contract that a partial uiSettings
      // override (one knob set) layers cleanly with the constructor
      // binding, so the operator never has to restate every field.
      const result = await resolveRateLimiterConfig({
        uiSettingsClient: makeUiSettingsClient({
          [DETECTION_EMULATION_RATE_LIMITER_MAX_COMMANDS_SETTING]: 200,
        }),
        config: makeConfig({ rateLimiter: undefined }),
        logger: makeLogger(),
        constructorConfig: {
          maxCommands: 100,
          windowMs: 60 * 60 * 1000,
          disabled: false,
          perHost: { capacity: 3, windowMs: 60 * 60 * 1000 },
        },
      });

      expect(result).toBeDefined();
      expect(result?.maxCommands).toBe(200); // ui override
      expect(result?.windowMs).toBe(60 * 60 * 1000); // constructor fallback
      expect(result?.perHost).toEqual({ capacity: 3, windowMs: 60 * 60 * 1000 }); // constructor fallback
    });

    it('overrides each field independently — operator can tune one knob without touching the others', async () => {
      const result = await resolveRateLimiterConfig({
        uiSettingsClient: makeUiSettingsClient({
          [DETECTION_EMULATION_RATE_LIMITER_MAX_COMMANDS_SETTING]: 200,
          // windowMs and perHostCapacity stay at the sentinel `0`
          // → fall back to kibana.yml for those two.
        }),
        config: makeConfig(),
        logger: makeLogger(),
      });

      expect(result).toBeDefined();
      expect(result?.maxCommands).toBe(200); // override
      expect(result?.windowMs).toBe(30 * 60 * 1000); // kibana.yml fallback
      expect(result?.perHost).toEqual({ capacity: 5, windowMs: 30 * 60 * 1000 }); // kibana.yml fallback
    });

    it('per-host capacity override preserves the kibana.yml per-host windowMs (not the per-space windowMs)', async () => {
      // Regression guard for the resolver's `perHost.windowMs` chain:
      // when the operator only sets per-host CAPACITY, the per-host
      // WINDOW must stay anchored to the kibana.yml per-host window —
      // collapsing it onto the (often shorter) per-space window would
      // silently squeeze the per-host bucket on every operator tweak.
      const result = await resolveRateLimiterConfig({
        uiSettingsClient: makeUiSettingsClient({
          [DETECTION_EMULATION_RATE_LIMITER_PER_HOST_CAPACITY_SETTING]: 10,
        }),
        config: makeConfig({
          rateLimiter: {
            maxCommands: 50,
            windowMs: 60_000, // 1 min per-space (intentionally short)
            disabled: false,
            perHost: { capacity: 5, windowMs: 60 * 60 * 1000 }, // 1h per-host
          },
        }),
        logger: makeLogger(),
      });

      expect(result?.perHost?.capacity).toBe(10);
      expect(result?.perHost?.windowMs).toBe(60 * 60 * 1000); // NOT 60_000
    });

    it('per-host capacity override falls back to per-space windowMs only when kibana.yml has no per-host', async () => {
      const result = await resolveRateLimiterConfig({
        uiSettingsClient: makeUiSettingsClient({
          [DETECTION_EMULATION_RATE_LIMITER_PER_HOST_CAPACITY_SETTING]: 10,
          [DETECTION_EMULATION_RATE_LIMITER_WINDOW_MS_SETTING]: 90_000,
        }),
        config: makeConfig({
          rateLimiter: {
            maxCommands: 50,
            windowMs: 30 * 60 * 1000,
            disabled: false,
            // no perHost in kibana.yml
          },
        }),
        logger: makeLogger(),
      });

      expect(result?.perHost?.capacity).toBe(10);
      // No kibana.yml per-host → falls back to the override windowMs.
      expect(result?.perHost?.windowMs).toBe(90_000);
    });

    it('preserves `disabled` from kibana.yml — Advanced Settings cannot toggle the bypass flag', async () => {
      // Locks the design decision that bypass-style flips
      // (`rateLimiter.disabled`) require a deliberate kibana.yml change
      // + restart, never a one-click UI toggle. If a future change
      // exposes `disabled` via Advanced Settings without an explicit
      // RBAC promotion, this test is the canary.
      const result = await resolveRateLimiterConfig({
        uiSettingsClient: makeUiSettingsClient({
          [DETECTION_EMULATION_RATE_LIMITER_MAX_COMMANDS_SETTING]: 200,
        }),
        config: makeConfig({
          rateLimiter: {
            maxCommands: 50,
            windowMs: 30 * 60 * 1000,
            disabled: true,
            perHost: { capacity: 5, windowMs: 30 * 60 * 1000 },
          },
        }),
        logger: makeLogger(),
      });

      expect(result?.disabled).toBe(true);
    });

    it('falls back to kibana.yml when uiSettings.get throws on any of the three reads', async () => {
      const throwingClient = {
        get: jest.fn().mockRejectedValue(new Error('uiSettings boom')),
      } as unknown as IUiSettingsClient;

      const result = await resolveRateLimiterConfig({
        uiSettingsClient: throwingClient,
        config: makeConfig(),
        logger: makeLogger(),
      });

      expect(result?.maxCommands).toBe(50); // kibana.yml
      expect(result?.windowMs).toBe(30 * 60 * 1000);
      expect(result?.perHost).toEqual({ capacity: 5, windowMs: 30 * 60 * 1000 });
    });
  });
});
