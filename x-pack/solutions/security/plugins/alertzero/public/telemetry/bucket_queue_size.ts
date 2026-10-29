/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueueSizeBucket } from './constants';

/** Reports the queue's open count as a range, so the count itself never ships. */
export const bucketQueueSize = (openCount: number): QueueSizeBucket => {
  if (openCount <= 0) {
    return '0';
  }
  if (openCount <= 10) {
    return '1_10';
  }
  if (openCount <= 50) {
    return '11_50';
  }
  return openCount <= 200 ? '51_200' : 'gt_200';
};
