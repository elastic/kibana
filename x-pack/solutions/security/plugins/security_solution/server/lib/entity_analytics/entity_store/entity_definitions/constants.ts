/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import {
  HOST_DEFINITION_VERSION,
  UNIVERSAL_DEFINITION_VERSION,
  USER_DEFINITION_VERSION,
  SERVICE_DEFINITION_VERSION,
} from './entity_descriptions';

export const VERSIONS_BY_ENTITY_TYPE: Record<EntityType, string> = {
  host: HOST_DEFINITION_VERSION,
  user: USER_DEFINITION_VERSION,
  universal: UNIVERSAL_DEFINITION_VERSION,
  service: SERVICE_DEFINITION_VERSION,
};

export const DEFAULT_FIELD_HISTORY_LENGTH = 10;
export const DEFAULT_SYNC_DELAY = '1m';
export const DEFAULT_FREQUENCY = '1m';
export const DEFAULT_LOOKBACK_PERIOD = '1d';
