/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceChangeEvent } from '@kbn/nightshift-sources-plugin/server';

export const getContinuousOnboardingTarget = ({
  eventType,
  total,
  isPaused,
}: {
  eventType: SourceChangeEvent['type'];
  total: number;
  isPaused: boolean;
}): boolean | undefined => {
  if (eventType === 'updated' || isPaused) {
    return;
  }
  if (eventType === 'created' && total === 1) {
    return true;
  }
  if (eventType === 'deleted' && total === 0) {
    return false;
  }
};
