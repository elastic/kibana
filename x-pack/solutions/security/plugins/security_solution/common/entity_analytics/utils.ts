/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_ALERTS_INDEX } from '../constants';
import { EntityType } from './types';

const ENTITY_ANALYTICS_ENTITY_TYPES = [EntityType.user, EntityType.host, EntityType.service];

export const getEntityAnalyticsEntityTypes = (): EntityType[] => ENTITY_ANALYTICS_ENTITY_TYPES;

export const getEnabledEntityTypes = (genericDefinitionEnabled: boolean): EntityType[] => {
  const entities = Object.values(EntityType);

  if (genericDefinitionEnabled) {
    return entities;
  }

  // Remove the index of generic
  entities.splice(entities.indexOf(EntityType.generic), 1);

  return entities;
};

export const getAlertsIndex = (spaceId = 'default') => `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
