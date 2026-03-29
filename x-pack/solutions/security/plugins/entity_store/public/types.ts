/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { EntityStoreStatus, EntityType } from '../common';
import type { LogExtractionUpdateParams } from '../common/log_extraction_params';

export type { LogExtractionUpdateParams };

export interface AppServices {
  http: HttpSetup;
  notifications: NotificationsStart;
}

export type EngineStatus = 'installing' | 'started' | 'stopped' | 'updating' | 'error';

export type EngineComponentResource =
  | 'entity_definition'
  | 'index_template'
  | 'task'
  | 'index'
  | 'ilm_policy'
  | 'component_template';

export interface EngineComponentStatus {
  id: string;
  installed: boolean;
  resource: EngineComponentResource;
  status?: string;
  remainingLogsToExtract?: number | null;
  runs?: number;
  lastError?: string;
}

export interface EngineDescriptor {
  type: EntityType;
  status: EngineStatus;
  filter: string;
  delay: string;
  timeout: string;
  frequency: string;
  lookbackPeriod: string;
  fieldHistoryLength: number;
  lastExecutionTimestamp?: string;
  components?: EngineComponentStatus[];
}

export interface EntityStoreStatusResponse {
  status: EntityStoreStatus;
  engines: EngineDescriptor[];
}

export interface InstallEntityStoreParams {
  entityTypes?: EntityType[];
  logExtraction?: LogExtractionUpdateParams;
}
