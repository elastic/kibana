/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { DocViewRestorableStateProps } from '@kbn/unified-doc-viewer/types';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';
import { useFlyoutApi } from '../../use_flyout_api';
import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';
import { urlParamKeyForHistoryKey } from './flyout_v2_url_param';
import type { FlyoutV2DocViewerState } from './flyout_v2_doc_viewer_state_schema';
import { registerFlyoutV2StateSink } from './flyout_v2_state_sink';
import { hasOpenFlyoutV2 } from './flyout_v2_url_writer';
import { openDescriptorAsChild, openDescriptorAsStart } from './use_flyout_v2_restore';

export interface UseFlyoutV2DocViewerStateParams
  extends DocViewRestorableStateProps<FlyoutV2DocViewerState> {
  /** The document displayed by the doc viewer, reused when a restored tool targets it. */
  hit: DataTableRecord;
}

const historyKey = DOC_VIEWER_FLYOUT_HISTORY_KEY;
const urlParamKey = urlParamKeyForHistoryKey(historyKey);

/**
 * Keeps the flyout chain opened from Discover's doc viewer in the doc view's restorable state
 * (instead of the `flyoutV2` URL param), so Discover can persist it alongside the expanded
 * document, and reopens that chain when the doc view mounts from a shared link.
 */
export const useFlyoutV2DocViewerState = ({
  hit,
  initialState,
  onInitialStateChange,
}: UseFlyoutV2DocViewerStateParams): void => {
  const flyoutApi = useFlyoutApi();
  const [initialStack] = useState(() => initialState?.flyoutV2 ?? []);
  const stackRef = useRef<FlyoutV2UrlParamValue>(initialStack);
  const onInitialStateChangeRef = useRef(onInitialStateChange);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    onInitialStateChangeRef.current = onInitialStateChange;
  }, [onInitialStateChange]);

  // Registered before the restore effect runs, so restored opens are recorded through the sink.
  useEffect(
    () =>
      registerFlyoutV2StateSink(historyKey, {
        read: () => stackRef.current,
        write: (stack) => {
          stackRef.current = stack ?? [];
          onInitialStateChangeRef.current?.({ flyoutV2: stack?.length ? stack : undefined });
        },
      }),
    []
  );

  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    const [first, second] = initialStack;

    // The doc view remounts on tab switches while its state is kept, so only reopen the chain
    // when it isn't already open (i.e. it came from a shared link or a page reload).
    if (!first || hasOpenFlyoutV2(urlParamKey)) {
      hasRestoredRef.current = true;
      return;
    }

    // Tools need the full document; only the displayed one is at hand, so others fall back to
    // opening their document flyout.
    const { _id: hitId, _index: hitIndex } = hit.raw;
    const getRestoreContext = (descriptor: FlyoutV2UrlParamValue[number]) => ({
      docHit:
        'documentId' in descriptor &&
        'indexName' in descriptor &&
        descriptor.documentId === hitId &&
        descriptor.indexName === hitIndex
          ? hit
          : undefined,
    });

    // Deferred so the doc viewer flyout is registered with the EUI flyout manager first, letting
    // the restored flyouts open on top of it within the same history group.
    const timeout = setTimeout(() => {
      hasRestoredRef.current = true;
      openDescriptorAsStart(first, getRestoreContext(first), flyoutApi, FLYOUT_ORIGIN.URL_RESTORE);
      if (second) {
        openDescriptorAsChild(
          second,
          getRestoreContext(second),
          flyoutApi,
          FLYOUT_ORIGIN.URL_RESTORE
        );
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [flyoutApi, hit, initialStack]);
};
