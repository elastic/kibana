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
  type SiemRuleMigrationsClient,
  SiemRuleMigrationsService,
} from './rules/siem_rule_migrations_service';

import type { SiemMigrationsSetupParams } from './types';
import {
  type SiemDashboardMigrationsClient,
  SiemDashboardMigrationsService,
} from './dashboards/siem_dashboard_migration_service';
import type { SiemMigrationsCreateClientParams } from './common/types';

export class SiemMigrationsService {
  private pluginStop$: Subject<void>;
  private rulesService: SiemRuleMigrationsService;
  private dashboardsService: SiemDashboardMigrationsService;

  constructor(private config: ConfigType, logger: LoggerFactory, kibanaVersion: string) {
    this.pluginStop$ = new ReplaySubject(1);
    this.rulesService = new SiemRuleMigrationsService(
      logger,
      kibanaVersion,
      config.siemRuleMigrations?.elserInferenceId
    );
    this.dashboardsService = new SiemDashboardMigrationsService(
      logger,
      kibanaVersion,
      config.siemRuleMigrations?.elserInferenceId
    );
  }

  setup(params: SiemMigrationsSetupParams) {
    if (!this.config.experimentalFeatures.siemMigrationsDisabled) {
      this.rulesService.setup({ ...params, pluginStop$: this.pluginStop$ });

      if (this.config.experimentalFeatures.automaticDashboardsMigration) {
        this.dashboardsService.setup({ ...params, pluginStop$: this.pluginStop$ });
      }
    }
  }

  createRulesClient(params: SiemMigrationsCreateClientParams): SiemRuleMigrationsClient {
    return this.rulesService.createClient(params);
  }

  createDashboardsClient(params: SiemMigrationsCreateClientParams): SiemDashboardMigrationsClient {
    return this.dashboardsService.createClient(params);
  }

  stop() {
    this.rulesService.stop();
    this.dashboardsService.stop();
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
