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
import type { DataTableRecord } from '@kbn/discover-utils';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { flyoutProviders } from '../components/flyout_provider';
import { FlyoutLoading } from '../components/flyout_loading';
import { defaultToolsFlyoutProperties } from '../hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../constants/flyout_history';
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../../session_context'; // Lazy-loaded so consumers of this hook don't statically pull the shared tool graph into their

// Lazy-loaded so consumers of this hook don't statically pull the shared tool graph into their
// bundle; the chunk only loads when the tool is actually opened.
const NotesDetails = lazy(() => import('./notes').then((m) => ({ default: m.NotesDetails })));

export interface OpenNotesParams {
  /** The document record whose notes should be shown. */
  hit: DataTableRecord;
}

export interface SharedToolsFlyoutApi {
  /** Opens the notes tools flyout for a document. */
  openNotes: (params: OpenNotesParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) shared tool flyouts — tools that are not owned by
 * a single flyout type and are reused across several of them (e.g. the notes flyout, opened from both
 * the document and attack flyouts). Same mindset as `useDocumentFlyoutApi`, `useEntityFlyoutApi`, etc.:
 * it encapsulates the provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`) and the tool
 * flyout properties so call sites don't repeat them.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useSharedToolsFlyoutApi = (): SharedToolsFlyoutApi => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const mainFlyoutSessionMode = useFlyoutSessionContext();

  const open = useCallback(
    (children: ReactNode, properties: OverlaySystemFlyoutOpenOptions) => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <FlyoutSessionContextProvider value={mainFlyoutSessionMode}>
              <Suspense fallback={<FlyoutLoading />}>{children}</Suspense>
            </FlyoutSessionContextProvider>
          ),
        }),
        properties
      );
    },
    [overlays, services, store, history, mainFlyoutSessionMode]
  );

  const openNotes = useCallback(
    ({ hit }: OpenNotesParams) => {
      open(<NotesDetails hit={hit} />, {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      });
    },
    [open, historyKey]
  );

  return useMemo(() => ({ openNotes }), [openNotes]);
};
