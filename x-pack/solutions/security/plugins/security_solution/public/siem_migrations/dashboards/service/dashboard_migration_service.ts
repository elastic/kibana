/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  TRACE_OPTIONS_SESSION_STORAGE_KEY,
} from '@kbn/elastic-assistant/impl/assistant_context/constants';
import type { TelemetryServiceStart } from '../../../common/lib/telemetry';
import type { StartPluginsDependencies } from '../../../types';
import { ExperimentalFeaturesService } from '../../../common/experimental_features_service';
import { licenseService } from '../../../common/hooks/use_license';
import type { CapabilitiesLevel, MissingCapability } from '../../common/service/capabilities';
import { getMissingCapabilities } from '../../common/service/capabilities';
import { SiemRulesMigrationsTelemetry } from '../../rules/service/telemetry';
import { SiemMigrationsStorage } from '../../common/service/storage';

// use the default assistant namespace since it's the only one we use
const NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY =
  `${DEFAULT_ASSISTANT_NAMESPACE}.${TRACE_OPTIONS_SESSION_STORAGE_KEY}` as const;

export const TASK_STATS_POLLING_SLEEP_SECONDS = 10 as const;
export const START_STOP_POLLING_SLEEP_SECONDS = 1 as const;

export class SiemDashboardMigrationsService {
  public connectorIdStorage = new SiemMigrationsStorage<string>('connectorId');
  public traceOptionsStorage = new SiemMigrationsStorage<TraceOptions>('traceOptions', {
    customKey: NAMESPACE_TRACE_OPTIONS_SESSION_STORAGE_KEY,
    storageType: 'session',
  });
  public telemetry: SiemRulesMigrationsTelemetry;

  constructor(
    private readonly core: CoreStart,
    private readonly plugins: StartPluginsDependencies,
    telemetryService: TelemetryServiceStart
  ) {
    this.telemetry = new SiemRulesMigrationsTelemetry(telemetryService);

    this.plugins.spaces.getActiveSpace().then((space) => {
      this.connectorIdStorage.setSpaceId(space.id);
    });
  }

  /** Accessor for the rule migrations API client */
  public get api() {
    return {};
  }

  /** Returns any missing capabilities for the user to use this feature */
  public getMissingCapabilities(level?: CapabilitiesLevel): MissingCapability[] {
    return getMissingCapabilities(this.core.application.capabilities, level);
  }

  /** Checks if the user has any missing capabilities for this feature */
  public hasMissingCapabilities(level?: CapabilitiesLevel): boolean {
    return this.getMissingCapabilities(level).length > 0;
  }

  /** Checks if the service is available based on the `license`, `capabilities` and `experimentalFeatures` */
  public isAvailable() {
    return (
      !ExperimentalFeaturesService.get().automaticDashboardsMigration &&
      licenseService.isEnterprise() &&
      !this.hasMissingCapabilities('minimum')
    );
  }
}
