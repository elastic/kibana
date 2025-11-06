/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { EntityAnalyticsRoutesDeps } from '../../../../lib/entity_analytics/types';
import type { EntityType } from '../../../../../common/search_strategy';

export interface EntityAnalyticsSubPluginsDependencies {
  ml: EntityAnalyticsRoutesDeps['ml'];
  request: KibanaRequest;
  soClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  spaceId: string;
}

export type EntityAnalyticsSubPlugin = (
  entityType: EntityType,
  dependencies: EntityAnalyticsSubPluginsDependencies
) => Promise<string>;
