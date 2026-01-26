/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationsRuleEventTypes } from '../../../common/lib/telemetry/events/siem_migrations/types';
import { SiemBaseMigrationsTelemetry } from '../../common/service/telemetry';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';

export class SiemRulesMigrationsTelemetry extends SiemBaseMigrationsTelemetry {
  constructor(telemetryService: TelemetryServiceStart) {
    super(telemetryService, SiemMigrationsRuleEventTypes);
  }
}
