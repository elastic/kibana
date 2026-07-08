/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AttackFlyoutApi } from './attack/use_attack_flyout_api';
import { useAttackFlyoutApi } from './attack/use_attack_flyout_api';

/**
 * The single developer-facing API for opening any new (EUI-based) Security Solution flyout.
 *
 * Rather than importing a per-type hook (`useAttackFlyoutApi`, `useDocumentFlyoutApi`, …), call
 * sites use this one hook and get every open method, namespaced by type
 * (`openAttackFlyout`, `openDocumentFlyoutFromIndex`, `openNetworkFlyout`, …). Each method comes in
 * a main variant (opens a new, top-level flyout) and, where it makes sense, an `...AsChild` variant
 * (opens nested inside the currently open flyout). Callers never deal with the flyout `session`.
 *
 * This is a thin facade: the per-type hooks own the actual wiring (lazy-loading, provider setup,
 * flyout properties) and remain the unit each team maintains. This file only composes them, so
 * adding a new flyout type is a one-line change here.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export type FlyoutApi = AttackFlyoutApi;

export const useFlyoutApi = (): FlyoutApi => {
  const attack = useAttackFlyoutApi();

  return useMemo(
    () => ({
      ...attack,
    }),
    [attack]
  );
};
