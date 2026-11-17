/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceChangeEvent } from '@kbn/nightshift-sources-plugin/server';

/**
 * Target enabled state for a feature that follows source presence.
 * Enables when the first source is created, disables when the last source is deleted,
 * and returns `undefined` when the setting should remain unchanged.
 */
export const getSourcePresenceEnabledTarget = ({
  eventType,
  total,
}: {
  eventType: SourceChangeEvent['type'];
  total: number;
}): boolean | undefined => {
  if (eventType === 'updated') {
    return;
  }
  if (eventType === 'created' && total === 1) {
    return true;
  }
  if (eventType === 'deleted' && total === 0) {
    return false;
  }
};
