/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { EntityOrEventItem } from './graph_grouped_node_preview_panel/components/grouped_item/types';

/**
 * Event bus used to notify external consumers (e.g. Security Solution plugin)
 * that a preview action has been triggered. This allows the graph package
 * to stay decoupled from flyout implementation details while still enabling
 * deep linking to single document/entity previews.
 */
export const previewAction$ = new Subject<EntityOrEventItem>();

// Simple in-memory state for lightweight duplicate suppression
let lastEmittedId: string | undefined;
let lastEmittedTs = 0;
const DEDUPE_WINDOW_MS = 250; // ignore exact same id within window

/**
 * Emit a preview action with naive duplicate suppression.
 * Use this from action buttons and header rows to trigger preview panels.
 *
 * @param item - The entity or event item to preview
 */
export const emitPreviewAction = (item: EntityOrEventItem): void => {
  const now = Date.now();
  if (item.id === lastEmittedId && now - lastEmittedTs < DEDUPE_WINDOW_MS) {
    return; // drop duplicate rapid click
  }
  lastEmittedId = item.id;
  lastEmittedTs = now;
  previewAction$.next(item);
};

/**
 * Reset internal dedupe state (primarily for tests).
 */
export const __resetPreviewActionDedupe = (): void => {
  lastEmittedId = undefined;
  lastEmittedTs = 0;
};
