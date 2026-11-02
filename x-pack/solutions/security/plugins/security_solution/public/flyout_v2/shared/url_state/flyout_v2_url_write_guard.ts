/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Distinguishes flyoutV2 URL updates written by {@link useFlyoutV2UrlWriter} from external
 * navigations (Agent Builder markdown links, pasted deep links, etc.).
 *
 * The restore hook listens to history changes and must open flyouts for external navigations,
 * but must ignore the writer's own `history.replace` calls — otherwise every interactive open
 * would re-trigger restore and double-open.
 *
 * Marks are cleared on a microtask so a write with no active listener cannot permanently
 * suppress a later external navigation.
 */

const pendingWrites = new Set<string>();

export const markFlyoutV2UrlWrite = (urlParamKey: string): void => {
  pendingWrites.add(urlParamKey);
  queueMicrotask(() => {
    pendingWrites.delete(urlParamKey);
  });
};

/**
 * Returns true when the current history change was caused by the URL writer for this param key.
 * Consuming clears the mark so a subsequent external navigation is not suppressed.
 */
export const consumeFlyoutV2UrlWrite = (urlParamKey: string): boolean => {
  if (!pendingWrites.has(urlParamKey)) {
    return false;
  }
  pendingWrites.delete(urlParamKey);
  return true;
};
