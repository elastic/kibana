/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import type { SourceProbe } from '../generator';

/** Gives every source of a definition the same probe result. */
export const probeAllAs = (
  definition: EntityDefinitionWithoutId,
  hasTimeSeries: boolean
): SourceProbe[] => (definition.dynamic?.sources ?? []).map(() => ({ hasTimeSeries }));
