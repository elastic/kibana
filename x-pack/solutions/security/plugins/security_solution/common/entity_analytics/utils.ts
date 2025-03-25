/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from './types';

const ENTITY_ANALYTICS_ENTITY_TYPES = [EntityType.host, EntityType.user, EntityType.service];

export const getEntityAnalyticsEntityTypes = (): EntityType[] => ENTITY_ANALYTICS_ENTITY_TYPES;
