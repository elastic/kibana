/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import { replaceUrlQuery } from '@kbn/kibana-utils-plugin/common';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

export const DOCUMENT_FLYOUT_OPEN_URL_PARAM = 'securitySolutionDocFlyoutOpen';
export const DOCUMENT_FLYOUT_REF_URL_PARAM = 'securitySolutionDocFlyoutRef';

export interface DocumentFlyoutRef {
  documentId: string;
  indexName: string;
}

export interface DocumentFlyoutUrlState {
  isOpen: boolean;
  docRef?: DocumentFlyoutRef;
}

export const isDocumentFlyoutRef = (value: unknown): value is DocumentFlyoutRef => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybeRef = value as Partial<DocumentFlyoutRef>;
  return typeof maybeRef.documentId === 'string' && typeof maybeRef.indexName === 'string';
};

const getUrlStateStorage = (history: History) =>
  createKbnUrlStateStorage({
    history,
    useHash: false,
    useHashQuery: false,
  });

export const getDocumentFlyoutUrlState = (history: History): DocumentFlyoutUrlState => {
  const urlStateStorage = getUrlStateStorage(history);
  const maybeDocRef = urlStateStorage.get<unknown>(DOCUMENT_FLYOUT_REF_URL_PARAM);

  return {
    isOpen: urlStateStorage.get<boolean>(DOCUMENT_FLYOUT_OPEN_URL_PARAM) === true,
    docRef: isDocumentFlyoutRef(maybeDocRef) ? maybeDocRef : undefined,
  };
};

export const setDocumentFlyoutUrlState = (history: History, docRef: DocumentFlyoutRef): void => {
  const urlStateStorage = getUrlStateStorage(history);

  // Keep the payload update in-place, then push one history entry for "open".
  urlStateStorage.set(DOCUMENT_FLYOUT_REF_URL_PARAM, docRef, { replace: true });
  urlStateStorage.set(DOCUMENT_FLYOUT_OPEN_URL_PARAM, true, { replace: false });
};

export const clearDocumentFlyoutUrlState = (history: History): void => {
  const urlStateStorage = getUrlStateStorage(history);

  void urlStateStorage.kbnUrlControls.updateAsync(
    (currentUrl) =>
      replaceUrlQuery(
        currentUrl,
        ({
          [DOCUMENT_FLYOUT_OPEN_URL_PARAM]: _open,
          [DOCUMENT_FLYOUT_REF_URL_PARAM]: _ref,
          ...rest
        }) => rest
      ),
    true
  );
};
