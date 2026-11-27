/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';

interface DocViewerFlyoutChain {
  /**
   * The doc viewer session (doc viewer instance and displayed document) the chain belongs to; see
   * `useDocViewerFlyoutChainSessionKey`.
   */
  sessionKey?: string;
  /**
   * Whether the chain holds its session's state: the overview tab seeded it, or a flyout opened in
   * the session (e.g. from the doc viewer header before the overview tab first mounted).
   */
  isLive: boolean;
  /** The open flyout chain, in the same format as the `flyoutV2` URL param. */
  stack: FlyoutV2UrlParamValue;
  /** Reports the chain to the mounted doc view; only set while that tab is mounted. */
  report?: (stack: FlyoutV2UrlParamValue) => void;
}

/**
 * Storage for the flyout chain opened from Discover's doc viewer, used instead of the `flyoutV2`
 * URL param (Discover persists it through the doc view's state). Module-scoped because flyouts
 * open in separate React roots via `openSystemFlyout`, where a React context would not be visible,
 * and because it must outlive the doc view tab: flyouts can open and close while another doc
 * viewer tab is selected.
 */
export const docViewerFlyoutChain: DocViewerFlyoutChain = { isLive: false, stack: [] };

/** Makes the chain belong to a doc viewer session, starting it over when the session changes. */
export const claimDocViewerFlyoutChain = (sessionKey: string): void => {
  if (docViewerFlyoutChain.sessionKey === sessionKey) {
    return;
  }
  docViewerFlyoutChain.sessionKey = sessionKey;
  docViewerFlyoutChain.isLive = false;
  docViewerFlyoutChain.stack = [];
};

/**
 * Records the open chain. Only an open makes the chain live: a close can come from a flyout of a
 * previous session that closed after another session claimed the chain.
 */
export const writeDocViewerFlyoutChain = (
  stack: FlyoutV2UrlParamValue | null,
  isOpen: boolean
): void => {
  docViewerFlyoutChain.stack = stack ?? [];
  if (isOpen) {
    docViewerFlyoutChain.isLive = true;
  }
  docViewerFlyoutChain.report?.(docViewerFlyoutChain.stack);
};
