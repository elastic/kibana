/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IScopedClusterClient,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ModelProvider, ToolProvider } from '@kbn/onechat-server';
import type { EntityAnalyticsRoutesDeps } from '../../../../lib/entity_analytics/types';
import type { EntityType } from '../../../../../common/search_strategy';

export interface EntityAnalyticsSubToolDependencies {
  ml: EntityAnalyticsRoutesDeps['ml'];
  request: KibanaRequest;
  soClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  spaceId: string;
  esClient: IScopedClusterClient;
  logger: Logger;
  toolProvider: ToolProvider;
  kibanaVersion: string;
  modelProvider: ModelProvider;
  prompt: string;
}

export type EntityAnalyticsSubTool = (
  entityType: EntityType,
  dependencies: EntityAnalyticsSubToolDependencies
) => Promise<{ message: string; index?: string }>;
