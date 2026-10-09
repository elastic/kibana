/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';

interface DocViewerFlyoutChain {
  /** Id of the document the chain belongs to; tells a tab remount from a document switch. */
  hitId?: string;
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
export const docViewerFlyoutChain: DocViewerFlyoutChain = { stack: [] };

export const writeDocViewerFlyoutChain = (stack: FlyoutV2UrlParamValue | null): void => {
  docViewerFlyoutChain.stack = stack ?? [];
  docViewerFlyoutChain.report?.(docViewerFlyoutChain.stack);
};
