/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../common/embeddables/overview/constants';
import { getOverviewEmbeddableSchema } from './schema';
import { getTransforms } from '../../../common/embeddables/overview/transforms/transforms';

/**
 * Registers the schema and transforms for the SLO Overview embeddable
 */
export const registerOverviewEmbeddableTransforms = (embeddable: EmbeddableSetup): void => {
  embeddable.registerTransforms(SLO_OVERVIEW_EMBEDDABLE_ID, {
    title: 'SLO overview',
    getSchema: getOverviewEmbeddableSchema,
    getTransforms,
  });
};
