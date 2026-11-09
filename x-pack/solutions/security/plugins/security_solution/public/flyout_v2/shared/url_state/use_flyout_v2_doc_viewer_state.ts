/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { isEqual } from 'lodash/fp';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import { useFlyoutApi } from '../../use_flyout_api';
import { claimDocViewerFlyoutChain, docViewerFlyoutChain } from './flyout_v2_doc_viewer_chain';
import { useDocViewerFlyoutChainSessionKey } from './use_doc_viewer_flyout_chain_session_key';
import type { FlyoutV2DocViewerStateProps } from './flyout_v2_doc_viewer_state_schema';
import type { FlyoutDescriptor, FlyoutV2UrlParamValue } from './flyout_v2_url_param';
import type { RestoreContext } from './use_flyout_v2_restore';
import {
  openDescriptorAsChild,
  openDescriptorAsStart,
  recordToIndicator,
} from './use_flyout_v2_restore';

export interface UseFlyoutV2DocViewerStateParams extends FlyoutV2DocViewerStateProps {
  /** The document displayed by the doc viewer, reused when a restored flyout targets it. */
  hit: DataTableRecord;
}

/**
 * Tools need the full record (or indicator) of the document they target; only the displayed one
 * is at hand, so descriptors targeting any other document fall back to opening their own flyout.
 */
const getRestoreContext = (descriptor: FlyoutDescriptor, hit: DataTableRecord): RestoreContext => {
  const { _id: hitId, _index: hitIndex } = hit.raw;

  if ('documentId' in descriptor) {
    return descriptor.documentId === hitId && descriptor.indexName === hitIndex
      ? { docHit: hit }
      : {};
  }
  if ('attackId' in descriptor) {
    return descriptor.attackId === hitId && descriptor.indexName === hitIndex
      ? { attackHit: hit }
      : {};
  }
  if (descriptor.kind === 'ioc') {
    return descriptor.indicatorId === hitId && descriptor.indicatorIndex === hitIndex
      ? { iocIndicator: recordToIndicator(hit) }
      : {};
  }
  return {};
};

/**
 * Keeps the flyout chain opened from Discover's doc viewer in the doc view's state (instead of the
 * `flyoutV2` URL param), so Discover can persist it alongside the expanded document, and reopens
 * that chain when the doc view mounts for a document from a shared link.
 *
 * The chain lives in `docViewerFlyoutChain`, which outlives this tab: flyouts can open and close
 * while another doc viewer tab is selected. The chain is only reported to the host while the tab
 * is mounted (a detached tab's `onInitialStateChange` would overwrite the other tabs' state), and
 * once the doc viewer session has a live chain, it wins over `initialState`.
 */
export const useFlyoutV2DocViewerState = ({
  hit,
  initialState,
  onInitialStateChange,
}: UseFlyoutV2DocViewerStateParams): void => {
  const flyoutApi = useFlyoutApi();
  const sessionKey = useDocViewerFlyoutChainSessionKey(hit);
  const [initialStack] = useState<FlyoutV2UrlParamValue>(() => initialState?.flyoutV2 ?? []);
  const flyoutApiRef = useRef(flyoutApi);
  const hitRef = useRef(hit);
  const onInitialStateChangeRef = useRef(onInitialStateChange);

  useEffect(() => {
    flyoutApiRef.current = flyoutApi;
    hitRef.current = hit;
    onInitialStateChangeRef.current = onInitialStateChange;
  }, [flyoutApi, hit, onInitialStateChange]);

  useEffect(() => {
    const report = (stack: FlyoutV2UrlParamValue) =>
      onInitialStateChangeRef.current?.({ flyoutV2: stack.length > 0 ? stack : undefined });

    let restoreTimeout: ReturnType<typeof setTimeout> | undefined;
    let isRestorePending = false;

    if (docViewerFlyoutChain.sessionKey === sessionKey && docViewerFlyoutChain.isLive) {
      // The tab remounted (doc viewer tab switch), or flyouts opened from the doc viewer header or
      // footer before it first mounted: hand the live chain to the host instead of reopening it.
      if (!isEqual(docViewerFlyoutChain.stack, initialStack)) {
        report(docViewerFlyoutChain.stack);
      }
    } else {
      claimDocViewerFlyoutChain(sessionKey);
      docViewerFlyoutChain.stack = initialStack;
      docViewerFlyoutChain.isLive = true;
      const [first, second] = initialStack;

      if (first) {
        isRestorePending = true;
        // Deferred so the doc viewer flyout is registered with the EUI flyout manager first,
        // letting the restored flyouts open on top of it within the same history group.
        restoreTimeout = setTimeout(() => {
          isRestorePending = false;
          const { current: api } = flyoutApiRef;
          const { current: displayedHit } = hitRef;
          // A root marked `asChild` was opened as the doc viewer's own child.
          const openFirst = first.asChild ? openDescriptorAsChild : openDescriptorAsStart;
          openFirst(first, getRestoreContext(first, displayedHit), api, FLYOUT_ORIGIN.URL_RESTORE);
          if (second) {
            openDescriptorAsChild(
              second,
              getRestoreContext(second, displayedHit),
              api,
              FLYOUT_ORIGIN.URL_RESTORE
            );
          }
        }, 0);
      }
    }

    docViewerFlyoutChain.report = report;

    return () => {
      clearTimeout(restoreTimeout);
      if (docViewerFlyoutChain.report === report) {
        docViewerFlyoutChain.report = undefined;
      }
      // Unmounted before the chain was reopened: let the next mount restore it.
      if (isRestorePending && docViewerFlyoutChain.sessionKey === sessionKey) {
        docViewerFlyoutChain.isLive = false;
      }
    };
  }, [sessionKey, initialStack]);
};
