/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { MitreAttackConfig } from './config';
import type { MitreAttackServerSetup, MitreAttackServerStart } from './types';
import { mitreAttackEntityType, MITRE_ATTACK_ENTITY_SO_TYPE } from './saved_objects';
import { MitreAttackDataService } from './services/mitre_attack_data_service';
import { createMitreAttackDataClient } from './services/mitre_attack_data_client/mitre_attack_data_client';

export class MitreAttackPlugin implements Plugin<MitreAttackServerSetup, MitreAttackServerStart> {
  private readonly config: MitreAttackConfig;
  private readonly logger: Logger;
  private readonly dataService: MitreAttackDataService;

  constructor(context: PluginInitializerContext<MitreAttackConfig>) {
    this.config = context.config.get<MitreAttackConfig>();
    this.logger = context.logger.get();
    this.dataService = new MitreAttackDataService(this.logger);
  }

  public setup(core: CoreSetup): MitreAttackServerSetup {
    if (!this.config.managedSourceEnabled) {
      return {};
    }

    core.savedObjects.registerType(mitreAttackEntityType);

    return {};
  }

  public start(core: CoreStart): MitreAttackServerStart {
    if (!this.config.managedSourceEnabled) {
      return {};
    }

    const savedObjectsRepository = core.savedObjects.createInternalRepository([
      MITRE_ATTACK_ENTITY_SO_TYPE,
    ]);
    this.dataService.initialize(savedObjectsRepository);

    // Population does not block or throw from start()
    this.dataService.populate().catch((err: Error) => {
      this.logger.error(`Unexpected error during MITRE ATT&CK data population: ${err.message}`);
    });

    const mitreDataClient = createMitreAttackDataClient({
      savedObjectsRepository,
      logger: this.logger,
      dataService: this.dataService,
    });

    return {
      getMitreDataClient: () => mitreDataClient,
    };
  }

  public stop(): void {}
}
