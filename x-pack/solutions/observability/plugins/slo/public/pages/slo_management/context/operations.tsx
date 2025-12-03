/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type TaskOperation = 'delete' | 'reset';

export const taskUrls = new Map<
  TaskOperation,
  | 'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31'
  | 'GET /api/observability/slos/_bulk_reset/{taskId} 2023-10-31'
>([
  ['delete', 'GET /api/observability/slos/_bulk_delete/{taskId} 2023-10-31'],
  ['reset', 'GET /api/observability/slos/_bulk_reset/{taskId} 2023-10-31'],
]);
