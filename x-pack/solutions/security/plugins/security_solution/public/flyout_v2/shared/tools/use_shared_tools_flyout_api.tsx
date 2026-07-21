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
  const { historyKey } = useFlyoutSessionContext();
  const open = useOpenFlyout();

  const openNotes = useCallback(
    ({ hit, origin }: OpenNotesParams) => {
      open(
        <NotesDetails hit={hit} />,
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: FLYOUT_SESSION_KIND.START,
          title: formatFlyoutTitle(NOTES_TITLE, getDocumentTitle(hit)),
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
    [open, historyKey]
  );

  return useMemo(() => ({ openNotes }), [openNotes]);
};
