/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_QUEUE_GROUP_MODE,
  QUEUE_GROUP_MODE_STORAGE_KEY,
  QUEUE_GROUP_MODES,
  type QueueGroupMode,
} from '../../types';

const isQueueGroupMode = (value: string | null): value is QueueGroupMode =>
  value != null && (QUEUE_GROUP_MODES as readonly string[]).includes(value);

/** Reads the session-scoped grouping mode, falling back to group-by-type. */
export const readQueueGroupMode = (): QueueGroupMode => {
  const stored = window.sessionStorage.getItem(QUEUE_GROUP_MODE_STORAGE_KEY);

  return isQueueGroupMode(stored) ? stored : DEFAULT_QUEUE_GROUP_MODE;
};

/** Persists the grouping mode for the rest of the browser session. */
export const writeQueueGroupMode = (mode: QueueGroupMode): void => {
  window.sessionStorage.setItem(QUEUE_GROUP_MODE_STORAGE_KEY, mode);
};
