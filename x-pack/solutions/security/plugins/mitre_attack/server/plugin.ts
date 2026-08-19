/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { MitreAttackConfig } from './config';
import { registerSavedObjects } from './saved_objects';
import { MitrePopulationService } from './services/mitre_population_service';
import {
  MitreAttackDataClientImpl,
  type MitreAttackDataClient,
} from './services/mitre_attack_data_client';
import { registerRoutes } from './routes';
import {
  MITRE_ATTACK_ENTITY_SO_TYPE,
  MITRE_ATTACK_POPULATION_META_SO_TYPE,
} from '../common/constants';

const ARTIFACT_PATH = join(__dirname, '../artifacts/mitre_artifact.json');

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MitreAttackPluginSetup {}

export interface MitreAttackPluginStart {
  getDataClient(): MitreAttackDataClient | undefined;
}

export class MitreAttackPlugin implements Plugin<MitreAttackPluginSetup, MitreAttackPluginStart> {
  private readonly logger: Logger;
  private readonly config: MitreAttackConfig;
  private coreSetup?: CoreSetup;
  private dataClient: MitreAttackDataClient | undefined;
  private repository: ISavedObjectsRepository | undefined;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get<MitreAttackConfig>();
  }

  public setup(core: CoreSetup): MitreAttackPluginSetup {
    this.coreSetup = core;
    registerSavedObjects(core.savedObjects);

    if (this.config.managedSourceEnabled) {
      this.logger.info('managed MITRE source enabled');
      const router = core.http.createRouter();
      registerRoutes(
        router,
        () => this.dataClient,
        () => this.repository
      );
    }

    return {};
  }

  public start(core: CoreStart): MitreAttackPluginStart {
    if (this.config.managedSourceEnabled && this.coreSetup) {
      const populationService = new MitrePopulationService(this.coreSetup, this.logger);
      void populationService.run(core).catch((err) => {
        this.logger.error(`MITRE population service unexpected error: ${err}`);
      });

      // Build the data client asynchronously so we can read defaultFrameworkVersion from artifact.
      void (async () => {
        try {
          const artifactRaw = await readFile(ARTIFACT_PATH, 'utf-8');
          const { framework_version: defaultFrameworkVersion } = JSON.parse(artifactRaw) as {
            framework_version: string;
          };
          const repository = core.savedObjects.createInternalRepository([
            MITRE_ATTACK_ENTITY_SO_TYPE,
            MITRE_ATTACK_POPULATION_META_SO_TYPE,
          ]);
          this.repository = repository;
          this.dataClient = new MitreAttackDataClientImpl(
            repository,
            defaultFrameworkVersion,
            this.logger
          );
          this.logger.info(
            `MITRE data client ready (defaultFrameworkVersion=${defaultFrameworkVersion})`
          );
        } catch (err) {
          this.logger.error(`MITRE data client init failed: ${err}`);
        }
      })();
    }

    return {
      getDataClient: () => this.dataClient,
    };
  }
}
