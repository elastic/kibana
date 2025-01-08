/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin as PluginClass } from '@kbn/core/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { CloudStart } from '@kbn/cloud-plugin/public';
import { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { EntityManagerPublicPluginSetup } from '@kbn/entityManager-plugin/public/types';

export interface EntityManagerPluginSetup {
  observabilityShared: ObservabilitySharedPluginSetup;
  serverless?: ServerlessPluginSetup;
  usageCollection: UsageCollectionSetup;
  entityManager: EntityManagerPublicPluginSetup;
}

export interface EntityManagerPluginStart {
  presentationUtil: PresentationUtilPluginStart;
  cloud?: CloudStart;
  serverless?: ServerlessPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
}

export type EntityManagerAppPluginClass = PluginClass<{}, {}>;
