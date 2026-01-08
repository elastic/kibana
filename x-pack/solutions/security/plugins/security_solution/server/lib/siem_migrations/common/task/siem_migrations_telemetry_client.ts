/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger, EventTypeOpts } from '@kbn/core/server';
import type { ItemDocument } from '../types';
import type { MigrationState } from './types';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/model/common.gen';

interface StartMigrationTaskTelemetry<I extends ItemDocument = ItemDocument> {
  startItemTranslation: () => {
    success: (migrationResult: MigrationState<I>) => void;
    failure: (error: Error) => void;
  };
  success: () => void;
  failure: (error: Error) => void;
  aborted: (error: Error) => void;
}

export abstract class SiemMigrationTelemetryClient<I extends ItemDocument = ItemDocument> {
  public abstract startSiemMigrationTask(): StartMigrationTaskTelemetry<I>;

  constructor(
    protected readonly telemetry: AnalyticsServiceSetup,
    protected readonly logger: Logger,
    protected readonly migrationId: string,
    protected readonly modelName: string = '',
    protected readonly vendor: SiemMigrationVendor
  ) {}

  protected reportEvent<T extends object>(eventTypeOpts: EventTypeOpts<T>, data: T): void {
    try {
      this.telemetry.reportEvent(eventTypeOpts.eventType, data);
    } catch (e) {
      this.logger.error(`Error reporting event ${eventTypeOpts.eventType}: ${e.message}`);
    }
  }
}
