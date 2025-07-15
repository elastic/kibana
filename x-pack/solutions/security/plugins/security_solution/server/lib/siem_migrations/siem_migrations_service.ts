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
import {
  SiemDashboardMigrationsService,
  type SiemDashboardMigrationsClient,
  type SiemDashboardMigrationsCreateClientParams,
} from './dashboards/siem_dashboard_migration_service';

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
    }

    if (this.config.experimentalFeatures.automaticDashboardsMigration) {
      this.dashboardsService.setup({ ...params, pluginStop$: this.pluginStop$ });
    }
  }

  createRulesClient(params: SiemRuleMigrationsCreateClientParams): SiemRuleMigrationsClient {
    return this.rulesService.createClient(params);
  }

  createDashboardsClient(
    params: SiemDashboardMigrationsCreateClientParams
  ): SiemDashboardMigrationsClient {
    return this.dashboardsService.createClient(params);
  }

  stop() {
    this.rulesService.stop();
    this.dashboardsService.stop();
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}
