/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; the GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", and the "Server Side Public License v 1".
 */

export { CHECKPOINT_INDEX } from './constants';
export type { CheckpointDoc, CheckpointRunScope, ScanRunScope } from './constants';
export {
  defaultReadCheckpoints,
  defaultWriteCheckpoint,
  ensureCheckpointIndex,
  readCheckpoints,
  writeCheckpoint,
} from './checkpoint_index';
