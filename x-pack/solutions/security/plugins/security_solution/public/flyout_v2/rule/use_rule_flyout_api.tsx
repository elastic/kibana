/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, Suspense, useCallback, useMemo } from 'react';
import { useStore } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { FlyoutLoading } from '../shared/components/flyout_loading';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../session_context'; // Lazy-loaded so consumers of this hook don't statically pull the rule flyout graph into their

// Lazy-loaded so consumers of this hook don't statically pull the rule flyout graph into their
// bundle; the chunk only loads when the flyout is actually opened.
const RuleDetails = lazy(() => import('./main').then((m) => ({ default: m.RuleDetails })));

export interface OpenRuleFlyoutParams {
  /** The unique identifier of the rule to display. */
  ruleId: string;
}

export interface RuleFlyoutApi {
  /**
   * Opens the rule details flyout as a new, top-level flyout (starting a fresh session).
   * Use this from outside any flyout — e.g. a case attachment, or a rule-name link that should
   * open its own flyout.
   */
  openRuleFlyout: (params: OpenRuleFlyoutParams) => void;
  /**
   * Opens the rule details flyout as a child of the currently open flyout (nested in its history
   * stack, so the back button returns to it). Use this from within an already-open flyout.
   */
  openRuleFlyoutAsChild: (params: OpenRuleFlyoutParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) rule flyout, in the same mindset as
 * `useExpandableFlyoutApi`, `useDocumentFlyoutApi`, `useAttackFlyoutApi`, etc. It encapsulates the
 * provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`) and the flyout properties so
 * call sites don't repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useRuleFlyoutApi = (): RuleFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const mainFlyoutSessionMode = useFlyoutSessionContext();

  // `session` is the only thing that differs between a main and a child flyout. It is kept private
  // here so callers never have to reason about it: they pick `openRuleFlyout` (main) or
  // `openRuleFlyoutAsChild` (child) and this helper maps that to the right session.
  const open = useCallback(
    (children: ReactNode, session: OverlaySystemFlyoutOpenOptions['session']) => {
      const properties: OverlaySystemFlyoutOpenOptions = {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session,
      };
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <FlyoutSessionContextProvider
              value={session === 'inherit' ? 'inherit' : mainFlyoutSessionMode}
            >
              <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>
            </FlyoutSessionContextProvider>
          ),
        }),
        properties
      );
    },
    [
      overlays,
      services,
      store,
      history,
      defaultDocumentFlyoutProperties,
      historyKey,
      mainFlyoutSessionMode,
    ]
  );

  const openRuleFlyout = useCallback(
    ({ ruleId }: OpenRuleFlyoutParams) => {
      open(<RuleDetails ruleId={ruleId} />, mainFlyoutSessionMode);
    },
    [open, mainFlyoutSessionMode]
  );

  const openRuleFlyoutAsChild = useCallback(
    ({ ruleId }: OpenRuleFlyoutParams) => {
      open(<RuleDetails ruleId={ruleId} />, 'inherit');
    },
    [open]
  );

  return useMemo(
    () => ({ openRuleFlyout, openRuleFlyoutAsChild }),
    [openRuleFlyout, openRuleFlyoutAsChild]
  );
};
