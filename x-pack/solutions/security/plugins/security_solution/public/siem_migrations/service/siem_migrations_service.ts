/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StartPluginsDependencies } from '../../types';
import { SiemRulesMigrationsService } from '../rules/service/rule_migrations_service';
import type { TelemetryServiceStart } from '../../common/lib/telemetry';

export class SiemMigrationsService {
  public rules: SiemRulesMigrationsService;

  constructor(
    coreStart: CoreStart,
    plugins: StartPluginsDependencies,
    telemetry: TelemetryServiceStart
  ) {
    this.rules = new SiemRulesMigrationsService(coreStart, plugins, telemetry);
  }
}
