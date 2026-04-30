/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useKibana } from '../../common/lib/kibana';
import { alertFlyoutHistoryKey } from './constants/flyout_history';
import { openDocumentFlyout, getActiveDocumentFlyoutRef } from './open_document_flyout';
import { cellActionRenderer } from '../shared/components/cell_actions';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { clearDocumentFlyoutUrlState, getDocumentFlyoutUrlState } from './url_state';

/**
 * Synchronizes URL-backed document flyout state with the system flyout overlay.
 * Mounted once at the app shell level to avoid many per-feature URL listeners.
 */
export const DocumentFlyoutUrlSynchronizer = memo(() => {
  const { services } = useKibana();
  const { overlays } = services;
  const store = useStore();
  const history = useHistory();
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const newFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');
  const [urlState, setUrlState] = useState(() => getDocumentFlyoutUrlState(history));
  const { isOpen: isFlyoutOpen, docRef } = urlState;

  useEffect(() => {
    const unlisten = history.listen(() => {
      setUrlState(getDocumentFlyoutUrlState(history));
    });

    return () => unlisten();
  }, [history]);

  const noopOnAlertUpdated = useCallback(() => {}, []);

  useEffect(() => {
    if (!newFlyoutSystemEnabled) {
      return;
    }

    if (!isFlyoutOpen) {
      return;
    }

    if (docRef && !getActiveDocumentFlyoutRef()) {
      openDocumentFlyout({
        overlays,
        services,
        store,
        history,
        documentId: docRef.documentId,
        indexName: docRef.indexName,
        renderCellActions: cellActionRenderer,
        onAlertUpdated: noopOnAlertUpdated,
        defaultFlyoutProperties,
        session: 'start',
        historyKey: alertFlyoutHistoryKey,
        persistToUrl: false,
        clearUrlOnClose: true,
      });
    } else if (!docRef) {
      clearDocumentFlyoutUrlState(history);
    }
  }, [
    defaultFlyoutProperties,
    docRef,
    history,
    isFlyoutOpen,
    newFlyoutSystemEnabled,
    noopOnAlertUpdated,
    overlays,
    services,
    store,
  ]);

  return null;
});

DocumentFlyoutUrlSynchronizer.displayName = 'DocumentFlyoutUrlSynchronizer';
