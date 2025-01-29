/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LoggerFactory } from '@kbn/core/server';
import { ReplaySubject, type Subject } from 'rxjs';
import type { ConfigType } from '../../config';
import {
  SiemRuleMigrationsService,
  type SiemRuleMigrationsClient,
  type SiemRuleMigrationsCreateClientParams,
} from './rules/siem_rule_migrations_service';
import type { SiemMigrationsSetupParams } from './types';

export class SiemMigrationsService {
  private pluginStop$: Subject<void>;
  private rules: SiemRuleMigrationsService;

  constructor(private config: ConfigType, logger: LoggerFactory, kibanaVersion: string) {
    this.pluginStop$ = new ReplaySubject(1);
    this.rules = new SiemRuleMigrationsService(logger, kibanaVersion);
  }

  setup(params: SiemMigrationsSetupParams) {
    if (!this.config.experimentalFeatures.siemMigrationsDisabled) {
      this.rules.setup({ ...params, pluginStop$: this.pluginStop$ });
    }
  }

  createRulesClient(params: SiemRuleMigrationsCreateClientParams): SiemRuleMigrationsClient {
    return this.rules.createClient(params);
  }

  stop() {
    this.rules.stop();
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
