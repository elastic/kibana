/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { SecurityAppStore } from '../common/store/types';
import type { StartServices } from '../types';
import { useIsInSecurityApp } from '../common/hooks/is_in_security_app';
import type { FlyoutOrigin } from '../common/lib/telemetry';
import { FLYOUT_SESSION_KIND, FLYOUT_SURFACE, FLYOUT_TOOL } from '../common/lib/telemetry';
import { useDefaultToolsFlyoutProperties } from '../flyout_v2/shared/hooks/use_default_flyout_properties';
import { trackFlyoutOpen } from '../flyout_v2/shared/hooks/use_flyout_telemetry';
import { documentFlyoutHistoryKey } from '../flyout_v2/shared/constants/flyout_history';
import { flyoutProviders } from '../flyout_v2/shared/components/flyout_provider';
import { NotesDetails } from '../flyout_v2/shared/tools/notes';
import {
  getNotesFlyoutTitle,
  getNotesFlyoutType,
} from '../flyout_v2/shared/tools/notes/utils/get_notes_flyout_details';
import { useFlyoutV2UrlWriter } from '../flyout_v2/shared/url_state/flyout_v2_url_writer';
import { claimDocViewerFlyoutChain } from '../flyout_v2/shared/url_state/flyout_v2_doc_viewer_chain';
import { useDocViewerFlyoutChainSessionKey } from '../flyout_v2/shared/url_state/use_doc_viewer_flyout_chain_session_key';
import {
  FLYOUT_DESCRIPTOR_KIND,
  urlParamKeyForHistoryKey,
} from '../flyout_v2/shared/url_state/flyout_v2_url_param';

export interface UseOpenNotesFlyoutParams {
  /** The document or attack whose notes are shown. */
  hit: DataTableRecord;
  /** Resolved Security services, or null while they load. */
  services: StartServices | null;
  /** Resolved Security redux store, or null while it loads. */
  store: SecurityAppStore | null;
  /** Telemetry origin of the notes flyout. */
  origin: FlyoutOrigin;
}

/**
 * Returns a callback opening the notes flyout from a doc viewer header or footer. These render
 * outside the Security app shell, so this mirrors `useSharedToolsFlyoutApi().openNotes`: it records
 * the flyout in the flyout chain, opens it and reports its telemetry.
 */
export const useOpenNotesFlyout = ({
  hit,
  services,
  store,
  origin,
}: UseOpenNotesFlyoutParams): (() => void) => {
  const history = useHistory();
  const isSecurityApp = useIsInSecurityApp();
  const historyKey = isSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultToolsFlyoutProperties = useDefaultToolsFlyoutProperties();
  const { writeOnOpen, buildOnClose } = useFlyoutV2UrlWriter(
    urlParamKeyForHistoryKey(historyKey),
    historyKey
  );
  const docViewerSessionKey = useDocViewerFlyoutChainSessionKey(hit);

  return useCallback(() => {
    if (!services || !store) {
      return;
    }

    if (!isSecurityApp) {
      // The doc view may not have mounted yet, so the chain may still belong to another session.
      claimDocViewerFlyoutChain(docViewerSessionKey);
    }
    const { _id: documentId, _index: indexName } = hit.raw;
    if (documentId && indexName) {
      writeOnOpen({ kind: FLYOUT_DESCRIPTOR_KIND.notes, documentId, indexName });
    }
    const ref = services.overlays?.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: <NotesDetails hit={hit} />,
      }),
      {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: FLYOUT_SESSION_KIND.START,
        title: getNotesFlyoutTitle(hit),
        onClose: buildOnClose(null),
      }
    );
    if (ref) {
      trackFlyoutOpen(services.telemetry, ref, {
        surface: FLYOUT_SURFACE.TOOL,
        flyoutType: getNotesFlyoutType(hit),
        tool: FLYOUT_TOOL.NOTES,
        session: FLYOUT_SESSION_KIND.START,
        origin,
      });
    }
  }, [
    buildOnClose,
    defaultToolsFlyoutProperties,
    docViewerSessionKey,
    history,
    historyKey,
    hit,
    isSecurityApp,
    origin,
    services,
    store,
    writeOnOpen,
  ]);
};
