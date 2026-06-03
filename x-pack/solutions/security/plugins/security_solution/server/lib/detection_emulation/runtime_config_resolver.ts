/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';

import {
  DETECTION_EMULATION_ALLOWLIST_ENDPOINT_IDS_SETTING,
  DETECTION_EMULATION_RATE_LIMITER_MAX_COMMANDS_SETTING,
  DETECTION_EMULATION_RATE_LIMITER_WINDOW_MS_SETTING,
  DETECTION_EMULATION_RATE_LIMITER_PER_HOST_CAPACITY_SETTING,
} from '../../../common/constants';
import type { ConfigType } from '../../config';
import { type EmulationAllowlistConfig, createAllowlistFromConfig } from './execution/allowlist';
import { type EmulationRateLimiterConfig } from './execution/rate_limiter';

/**
 * Per-space runtime resolution of detection-emulation guardrails.
 *
 * # Three-layer config model
 *
 * The four operator-tunable knobs have THREE layered sources, in
 * order of precedence (highest first):
 *
 *   1. Per-space Advanced Settings (`securitySolution:detectionEmulation:*`)
 *      — read per-request via a space-scoped `IUiSettingsClient`. Take
 *      effect on the next request with no restart.
 *   2. Deployment-wide `kibana.yml` defaults
 *      (`xpack.securitySolution.detectionEmulation.*`) — loaded once
 *      at plugin start. Require a Kibana restart to change.
 *   3. Constructor-bound config of the long-lived `EmulationRateLimiter`
 *      / `EmulationAllowlist` singletons — built at plugin start from
 *      layer 2 (or hardcoded defaults if layer 2 is empty). Acts as the
 *      "always-present" final fallback so a partial layer-1 override
 *      (one knob set in Advanced Settings) layers cleanly without
 *      requiring the operator to restate every field.
 *
 * # `undefined` return contract
 *
 * Both resolvers return `undefined` when NEITHER layer 1 nor layer 2
 * supplies any override. The caller MUST then pass `undefined` to
 * `validate()` / `acquire()`, which signals "use the constructor
 * binding" (layer 3). This avoids a subtle hijacking bug where the
 * resolver would otherwise materialise a synthesized default config
 * and pass it to the gate, silently clobbering whatever the singleton
 * was built with at plugin start.
 *
 * # Sentinel values
 *
 *   - allowlist: empty array → fall back. (Operators can't "override
 *     to empty" via Advanced Settings — that's intentional. A
 *     deliberate empty allowlist should require a kibana.yml change.)
 *   - rate-limiter numbers: 0 → fall back. (uiSettings schema enforces
 *     non-negative; 0 is an unambiguous "use the default" signal.)
 *
 * # No-merge contract
 *
 * Per-space allowlist OVERRIDES (does not merge with) the kibana.yml
 * allowlist. Merging would silently leak deployment-wide endpoint IDs
 * into a space whose operator deliberately scoped down. The
 * rate-limiter merges field-by-field BUT only across the
 * uiSettings/yml/constructor stack, never between two layers'
 * allowlists.
 *
 * # In-flight-bucket mutation semantics
 *
 * Lowering `maxCommands` or `windowMs` via Advanced Settings does NOT
 * retroactively evict already-recorded entries — the rate limiter's
 * stateful sliding window is constructor-bound. The next acquire()
 * sees the effective lower cap; existing entries either stay or
 * naturally fall out of the (newly shorter) window via cleanup. This
 * means a panic-button "drop the cap to 1" hits hard on the next
 * request but does not nuke pending dispatches mid-flight, which is
 * the desired behavior for an operator knob that's not a kill switch.
 *
 * # Caching
 *
 * None here. The Kibana core uiSettings client already caches
 * per-request, so a single resolver call per gate sequence is cheap.
 * If we ever start calling resolve() more than once per request, add
 * an in-request memo.
 *
 * # Bypass-style flags are NOT exposed via Advanced Settings
 *
 * `allowlist.allowAll` and `rateLimiter.disabled` both bypass the
 * gate entirely. They remain `kibana.yml`-only and require a restart
 * to flip — a one-click UI toggle on either is a foot-gun: a space
 * admin could disable the rate limiter "to test" and forget. RBAC for
 * the new uiSettings is bound to the existing `securitySolution`
 * feature's "Advanced Settings: Read/Write" privileges; no new
 * sub-feature privilege is introduced because the four knobs are
 * already gated behind the `detectionEmulationRealExecution`
 * experimental flag (registration is conditional in `ui_settings.ts`).
 */

/**
 * Resolve the effective allowlist for the current request's space.
 *
 * Returns:
 *   - `undefined` when neither the Advanced Setting nor `kibana.yml`
 *     supplies an override. The caller MUST pass `undefined` to
 *     `validate()` so the call falls through to the constructor-bound
 *     config (the default-deny shape created at plugin start, or
 *     whatever the test fixture injected).
 *   - A concrete `EmulationAllowlistConfig` when either layer supplies
 *     an override. uiSettings (per-space) wins over `kibana.yml`
 *     (deployment-wide); we never silently merge the two — merging
 *     would leak deployment-wide endpoint IDs into a space whose
 *     operator deliberately scoped down.
 *
 * `allowAll` is intentionally NOT exposed via Advanced Settings — it's
 * an emergency escape hatch that should require a deliberate
 * `kibana.yml` change + restart, not a one-click toggle in a UI a
 * space admin might flip and forget.
 */
export const resolveAllowlistConfig = async ({
  uiSettingsClient,
  config,
  logger,
}: {
  uiSettingsClient: IUiSettingsClient;
  config: ConfigType;
  logger: Logger;
}): Promise<EmulationAllowlistConfig | undefined> => {
  let override: string[] = [];
  try {
    override = await uiSettingsClient.get<string[]>(
      DETECTION_EMULATION_ALLOWLIST_ENDPOINT_IDS_SETTING
    );
  } catch (err) {
    // uiSettings.get() can throw if the key is unregistered (feature
    // flag off) or the request is space-less. Fall through to the
    // kibana.yml layer; if that's also unset, return `undefined` so
    // the caller defers to the constructor-bound config.
    logger.debug(
      `[detection-emulation] uiSettings allowlist read failed; falling back to kibana.yml: ${
        (err as Error)?.message ?? err
      }`
    );
  }

  if (Array.isArray(override) && override.length > 0) {
    // Per-space override wins outright — never merged with kibana.yml.
    return { allowAll: false, allowedHosts: new Set(override) };
  }

  // No uiSettings override → defer to kibana.yml. If that's also unset,
  // return `undefined` to defer to the constructor binding.
  if (config.detectionEmulation?.allowlist === undefined) {
    return undefined;
  }
  return createAllowlistFromConfig(config.detectionEmulation.allowlist);
};

/**
 * Resolve the effective rate-limiter config for the current request's
 * space.
 *
 * Returns:
 *   - `undefined` when no Advanced Setting OR `kibana.yml` field is
 *     supplied. The caller MUST pass `undefined` to `acquire()` so the
 *     call falls through to the constructor-bound config.
 *   - A concrete `EmulationRateLimiterConfig` when at least one layer
 *     supplies at least one override. Field-by-field merge: each
 *     Advanced Setting overrides its corresponding `rateLimiter.*`
 *     field independently, so an operator can tune (say) just the
 *     per-host capacity without restating every other knob. Sentinel
 *     `0` means "this Advanced Setting is unset"; we then fall through
 *     to the `kibana.yml` value, then to the constructor binding.
 *
 * `disabled` is intentionally NOT exposed via Advanced Settings —
 * bypassing the rate limiter is a deployment-wide invariant that
 * should require a `kibana.yml` change + restart, matching the
 * `allowlist.allowAll` rationale.
 */
export const resolveRateLimiterConfig = async ({
  uiSettingsClient,
  config,
  logger,
  constructorConfig,
}: {
  uiSettingsClient: IUiSettingsClient;
  config: ConfigType;
  logger: Logger;
  /**
   * The constructor-bound config of the rate limiter. Used as the
   * final fallback for any field not covered by uiSettings or
   * `kibana.yml`. Optional — when omitted, the function reports "no
   * override" by returning `undefined` whenever neither uiSettings nor
   * `kibana.yml` supplies a value. (Production routes pass the
   * limiter's `getConfig()` result; pure unit tests can omit it to
   * exercise the no-override path explicitly.)
   */
  constructorConfig?: EmulationRateLimiterConfig;
}): Promise<EmulationRateLimiterConfig | undefined> => {
  let maxCommandsOverride = 0;
  let windowMsOverride = 0;
  let perHostCapacityOverride = 0;
  try {
    [maxCommandsOverride, windowMsOverride, perHostCapacityOverride] = await Promise.all([
      uiSettingsClient.get<number>(DETECTION_EMULATION_RATE_LIMITER_MAX_COMMANDS_SETTING),
      uiSettingsClient.get<number>(DETECTION_EMULATION_RATE_LIMITER_WINDOW_MS_SETTING),
      uiSettingsClient.get<number>(DETECTION_EMULATION_RATE_LIMITER_PER_HOST_CAPACITY_SETTING),
    ]);
  } catch (err) {
    logger.debug(
      `[detection-emulation] uiSettings rate-limiter read failed; falling back to kibana.yml: ${
        (err as Error)?.message ?? err
      }`
    );
  }

  const ymlConfig = config.detectionEmulation?.rateLimiter;
  const hasUiSettingsOverride =
    maxCommandsOverride > 0 || windowMsOverride > 0 || perHostCapacityOverride > 0;
  const hasYmlOverride = ymlConfig !== undefined;

  if (!hasUiSettingsOverride && !hasYmlOverride) {
    // Nothing to override → defer to the constructor binding.
    return undefined;
  }

  // Build effective config layering uiSettings > kibana.yml > constructor.
  const layeredFallback = ymlConfig ?? constructorConfig;
  if (!layeredFallback) {
    // Pathological: uiSettings supplies a partial override, no
    // kibana.yml, and the caller didn't pass `constructorConfig`. We
    // can't synthesize a complete config without a base — defer.
    return undefined;
  }

  return {
    maxCommands: maxCommandsOverride > 0 ? maxCommandsOverride : layeredFallback.maxCommands,
    windowMs: windowMsOverride > 0 ? windowMsOverride : layeredFallback.windowMs,
    disabled: layeredFallback.disabled,
    perHost:
      perHostCapacityOverride > 0
        ? {
            capacity: perHostCapacityOverride,
            // The per-host window stays anchored to the constructor /
            // kibana.yml per-host window when present, so a single
            // per-host capacity tweak in Advanced Settings doesn't
            // accidentally collapse the per-host window to the (often
            // shorter) per-space one.
            windowMs:
              layeredFallback.perHost?.windowMs ??
              (windowMsOverride > 0 ? windowMsOverride : layeredFallback.windowMs),
          }
        : layeredFallback.perHost,
  };
};
