/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from '../../../common/embeddables/burn_rate/constants';
import { getBurnRateEmbeddableSchema } from './burn_rate_schema';
import { getTransforms } from '../../../common/embeddables/burn_rate/transforms/transforms';

/**
 * Registers the schema and transforms for the SLO Burn Rate embeddable
 */
export const registerBurnRateEmbeddableTransforms = (embeddable: EmbeddableSetup): void => {
  embeddable.registerTransforms(SLO_BURN_RATE_EMBEDDABLE_ID, {
    getSchema: getBurnRateEmbeddableSchema,
    getTransforms,
  });
};
