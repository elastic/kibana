/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { OverlayStart } from '@kbn/core/public';
import type { History } from 'history';
import type { Store } from 'redux';
import type { StartServices } from '../../types';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from './document_flyout_wrapper';
import { clearDocumentFlyoutUrlState, setDocumentFlyoutUrlState } from './url_state';

let activeDocumentFlyoutRef: OverlayRef | null = null;

export const getActiveDocumentFlyoutRef = (): OverlayRef | null => activeDocumentFlyoutRef;

export const closeActiveDocumentFlyout = (): void => {
  if (!activeDocumentFlyoutRef) {
    return;
  }

  const ref = activeDocumentFlyoutRef;
  activeDocumentFlyoutRef = null;
  ref.close();
};

export interface OpenDocumentFlyoutParams {
  overlays: OverlayStart;
  services: StartServices;
  store: Store;
  history: History;
  documentId?: string;
  indexName?: string;
  renderCellActions: CellActionRenderer;
  onAlertUpdated: () => void;
  defaultFlyoutProperties: OverlaySystemFlyoutOpenOptions;
  session?: OverlaySystemFlyoutOpenOptions['session'];
  historyKey?: symbol;
  persistToUrl?: boolean;
  clearUrlOnClose?: boolean;
  onClose?: () => void;
}

export const openDocumentFlyout = ({
  overlays,
  services,
  store,
  history,
  documentId,
  indexName,
  renderCellActions,
  onAlertUpdated,
  defaultFlyoutProperties,
  session,
  historyKey,
  persistToUrl = true,
  clearUrlOnClose = true,
  onClose,
}: OpenDocumentFlyoutParams): OverlayRef => {
  if (persistToUrl && documentId && indexName) {
    setDocumentFlyoutUrlState(history, { documentId, indexName });
  }

  closeActiveDocumentFlyout();

  activeDocumentFlyoutRef = overlays.openSystemFlyout(
    flyoutProviders({
      services,
      store,
      history,
      children: (
        <DocumentFlyoutWrapper
          documentId={documentId}
          indexName={indexName}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />
      ),
    }),
    {
      ...defaultFlyoutProperties,
      ...(historyKey ? { historyKey } : {}),
      ...(session ? { session } : {}),
      onClose: () => {
        activeDocumentFlyoutRef = null;
        if (clearUrlOnClose) {
          clearDocumentFlyoutUrlState(history);
        }
        onClose?.();
      },
    }
  );

  return activeDocumentFlyoutRef;
};
