/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemDocument } from '../types';
import type { MigrationState } from './types';

interface StartMigrationTaskTelemetry<I extends ItemDocument = ItemDocument> {
  startItemTranslation: () => {
    success: (migrationResult: MigrationState<I>) => void;
    failure: (error: Error) => void;
  };
  success: () => void;
  failure: (error: Error) => void;
  aborted: (error: Error) => void;
}

export interface SiemMigrationTelemetryClient<I extends ItemDocument = ItemDocument> {
  startSiemMigrationTask(): StartMigrationTaskTelemetry<I>;
}
