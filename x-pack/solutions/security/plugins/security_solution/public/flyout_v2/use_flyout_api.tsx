/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AttackFlyoutApi } from './attack/use_attack_flyout_api';
import { useAttackFlyoutApi } from './attack/use_attack_flyout_api';
import type { DocumentFlyoutApi } from './document/use_document_flyout_api';
import { useDocumentFlyoutApi } from './document/use_document_flyout_api';
import type { IocFlyoutApi } from './ioc/use_ioc_flyout_api';
import { useIocFlyoutApi } from './ioc/use_ioc_flyout_api';
import type { NetworkFlyoutApi } from './network/use_network_flyout_api';
import { useNetworkFlyoutApi } from './network/use_network_flyout_api';
import type { RuleFlyoutApi } from './rule/use_rule_flyout_api';
import { useRuleFlyoutApi } from './rule/use_rule_flyout_api';

/**
 * The single developer-facing API for opening any new (EUI-based) Security Solution flyout.
 *
 * Rather than importing a per-type hook (`useDocumentFlyoutApi`, ...), call
 * sites use this one hook and get every open method, namespaced by type
 * (`openDocumentFlyoutFromIndex`, ...).
 * Each method comes in
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
export type FlyoutApi = DocumentFlyoutApi &
  AttackFlyoutApi &
  IocFlyoutApi &
  NetworkFlyoutApi &
  RuleFlyoutApi;

export const useFlyoutApi = (): FlyoutApi => {
  const documentApi = useDocumentFlyoutApi();
  const attack = useAttackFlyoutApi();
  const ioc = useIocFlyoutApi();
  const network = useNetworkFlyoutApi();
  const rule = useRuleFlyoutApi();

  return useMemo(
    () => ({
      ...documentApi,
      ...attack,
      ...ioc,
      ...network,
      ...rule,
    }),
    [documentApi, attack, ioc, network, rule]
  );
};
