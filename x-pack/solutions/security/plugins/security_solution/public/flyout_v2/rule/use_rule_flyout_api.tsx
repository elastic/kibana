/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { lazy, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { FlyoutOrigin, FlyoutSessionKind } from '../../common/lib/telemetry';
import { FLYOUT_SESSION_KIND, FLYOUT_SURFACE, FLYOUT_TYPE } from '../../common/lib/telemetry';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../shared/hooks/use_open_flyout';
import { buildFlyoutNavTitle } from '../shared/utils/build_flyout_nav_title';
import { RULE_TITLE } from '../shared/constants/flyout_titles';
import { useFlyoutSessionContext } from '../session_context';
import { useFlyoutV2UrlWriter } from '../shared/url_state/flyout_v2_url_writer';
import {
  FLYOUT_DESCRIPTOR_KIND,
  decodeFlyoutV2UrlParam,
  urlParamKeyForHistoryKey,
} from '../shared/url_state/flyout_v2_url_param';
import type { FlyoutDescriptor } from '../shared/url_state/flyout_v2_url_param';

// Lazy-loaded so consumers of this hook don't statically pull the rule flyout graph into their
// bundle; the chunk only loads when the flyout is actually opened.
const RuleDetails = lazy(() => import('./main').then((m) => ({ default: m.RuleDetails })));

export interface OpenRuleFlyoutParams {
  /** The unique identifier of the rule to display. */
  ruleId: string;
  /** Which UI trigger opened this flyout, when known. */
  origin?: FlyoutOrigin;
  /**
   * Flyout-history title to use for this open, e.g. `formatFlyoutTitle(RULE_TITLE, ruleName)`.
   * Omitted falls back to the bare "Rule" title.
   */
  title?: string;
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
  const history = useHistory();
  const { session: sessionMode, historyKey } = useFlyoutSessionContext();
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const openFlyout = useOpenFlyout();
  const urlParamKey = urlParamKeyForHistoryKey(historyKey);
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(urlParamKey, historyKey);

  const readFirstDescriptor = useCallback((): FlyoutDescriptor | null => {
    if (!history?.location) return null;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    const stack = decodeFlyoutV2UrlParam(raw);
    return stack?.[0] ?? null;
  }, [history, urlParamKey]);

  const open = useCallback(
    (
      children: ReactNode,
      session: FlyoutSessionKind,
      title: OverlaySystemFlyoutOpenOptions['title'],
      onClose: (() => void) | undefined,
      origin?: FlyoutOrigin
    ) => {
      const properties: OverlaySystemFlyoutOpenOptions = {
        ...defaultDocumentFlyoutProperties,
        historyKey,
        session,
        title,
        onClose,
      };
      openFlyout(
        children,
        properties,
        { surface: FLYOUT_SURFACE.FLYOUT, flyoutType: FLYOUT_TYPE.RULE, session, origin },
        session === FLYOUT_SESSION_KIND.INHERIT ? FLYOUT_SESSION_KIND.INHERIT : sessionMode
      );
    },
    [openFlyout, defaultDocumentFlyoutProperties, historyKey, sessionMode]
  );

  const openRuleFlyout = useCallback(
    ({ ruleId, title, origin }: OpenRuleFlyoutParams) => {
      writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId });
      const onClose = buildOnClose(null);
      open(<RuleDetails ruleId={ruleId} />, sessionMode, title ?? RULE_TITLE, onClose, origin);
    },
    [open, sessionMode, writeOnOpen, buildOnClose]
  );

  const openRuleFlyoutAsChild = useCallback(
    ({ ruleId, title, origin }: OpenRuleFlyoutParams) => {
      const parentDescriptor = readFirstDescriptor();
      writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId }, 'inherit');
      const onClose = buildOnClose(parentDescriptor);
      open(
        <RuleDetails ruleId={ruleId} />,
        FLYOUT_SESSION_KIND.INHERIT,
        buildFlyoutNavTitle(title ?? RULE_TITLE),
        onClose,
        origin
      );
    },
    [open, readFirstDescriptor, writeOnOpen, buildOnClose]
  );

  return useMemo(
    () => ({ openRuleFlyout, openRuleFlyoutAsChild }),
    [openRuleFlyout, openRuleFlyoutAsChild]
  );
};
