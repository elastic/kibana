/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PackageService } from '@kbn/fleet-plugin/server';
import type { InferenceClient } from '@kbn/inference-common';

export interface SiemMigrationsClientDependencies {
  inferenceClient: InferenceClient;
  rulesClient: RulesClient;
  actionsClient: ActionsClient;
  savedObjectsClient: SavedObjectsClientContract;
  packageService?: PackageService;
  telemetry: AnalyticsServiceSetup;
}

export type SiemMigrationsIndexNameProvider = () => Promise<string>;
