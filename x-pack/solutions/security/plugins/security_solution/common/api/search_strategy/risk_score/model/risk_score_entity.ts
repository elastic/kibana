/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { EntityType } from '../../../../entity_analytics/types';

export const riskScoreEntity = lazySchema(() => z.nativeEnum(EntityType));
export const riskScoreEntityArray = lazySchema(() => z.array(z.nativeEnum(EntityType)));
