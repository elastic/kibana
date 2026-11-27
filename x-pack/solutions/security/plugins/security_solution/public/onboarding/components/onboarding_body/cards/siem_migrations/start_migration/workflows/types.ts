/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartMigrationCardMetadata } from '../common/types';

export interface StartWorkflowMigrationCardMetadata extends StartMigrationCardMetadata {
  /** The Workflows UI (`workflows:ui:enabled`) is turned off, so the migration service is not available */
  isWorkflowsUiDisabled: boolean;
}
