/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { FlyoutOrigin } from '../../../common/lib/telemetry';
import { FLYOUT_SESSION_KIND, FLYOUT_SURFACE, FLYOUT_TOOL } from '../../../common/lib/telemetry';
import { defaultToolsFlyoutProperties } from '../hooks/use_default_flyout_properties';
import { useOpenFlyout } from '../hooks/use_open_flyout';
import { formatFlyoutTitle, NOTES_TITLE } from '../constants/flyout_titles';
import { getDocumentTitle } from '../../document/main/utils/get_header_title';
import { useFlyoutSessionContext } from '../../session_context';
import { useFlyoutV2UrlWriter } from '../url_state/flyout_v2_url_writer';
import { FLYOUT_DESCRIPTOR_KIND, urlParamKeyForHistoryKey } from '../url_state/flyout_v2_url_param';

// Lazy-loaded so consumers of this hook don't statically pull the shared tool graph into their
// bundle; the chunk only loads when the tool is actually opened.
const NotesDetails = lazy(() => import('./notes').then((m) => ({ default: m.NotesDetails })));

export interface OpenNotesParams {
  /** The document record whose notes should be shown. */
  hit: DataTableRecord;
  /** Telemetry origin indicating where the notes flyout was opened from. */
  origin?: FlyoutOrigin;
}

export interface SharedToolsFlyoutApi {
  /** Opens the notes tools flyout for a document. */
  openNotes: (params: OpenNotesParams) => void;
}

/**
 * Developer-facing API to open the new (EUI-based) shared tool flyouts — tools that are not owned by
 * a single flyout type and are reused across several of them (e.g. the notes flyout, opened from both
 * the document and attack flyouts). Same mindset as `useDocumentFlyoutApi`, `useEntityFlyoutApi`, etc.:
 * it encapsulates the provider wiring (`flyoutProviders` + `overlays.openSystemFlyout`, via
 * `useOpenFlyout`) and the tool flyout properties so call sites don't repeat them. `useOpenFlyout`
 * also reports open/close telemetry.
 *
 * This API only ever opens the NEW flyout. It does not know about the legacy expandable flyout:
 * callers remain responsible for gating on `useIsNewFlyoutEnabled()` and falling back to the
 * legacy flyout when it is off.
 *
 * Must be used within the Security Solution app shell (Redux store + router + Kibana services).
 */
export const useSharedToolsFlyoutApi = (): SharedToolsFlyoutApi => {
  const { historyKey } = useFlyoutSessionContext();
  const open = useOpenFlyout();
  const urlParamKey = urlParamKeyForHistoryKey(historyKey);
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(urlParamKey, historyKey);

  const openNotes = useCallback(
    ({ hit, origin }: OpenNotesParams) => {
      const documentId = hit.raw._id as string;
      const indexName = hit.raw._index as string;
      writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.notes, documentId, indexName });
      // A tool flyout opens with session:'start' — it is a root, not a child of the document, and
      // the document is not persisted alongside it. Closing the tool therefore clears the param
      // (reverting to the document would resurrect a flyout that was never part of the saved state).
      const onClose = buildOnClose(null);
      open(
        <NotesDetails hit={hit} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(NOTES_TITLE, getDocumentTitle(hit)),
          onClose,
        },
        {
          surface: FLYOUT_SURFACE.TOOL,
          tool: FLYOUT_TOOL.NOTES,
          session: FLYOUT_SESSION_KIND.START,
          origin,
        },
        FLYOUT_SESSION_KIND.INHERIT
      );
    },
    [open, historyKey, writeOnOpen, buildOnClose]
  );

  return useMemo(() => ({ openNotes }), [openNotes]);
};
