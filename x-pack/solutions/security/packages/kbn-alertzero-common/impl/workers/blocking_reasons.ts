/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerBlockingReason } from '../schemas';

/** Whether a Worker with these blocking reasons may not be switched on. Switching it off is always allowed. `weak_role` is warning-only: the role can be restored on the bound account without touching the Worker, so it must not gate. */
export const isWorkerEnableBlocked = (blockingReasons: readonly WorkerBlockingReason[]): boolean =>
  blockingReasons.includes('no_model');
