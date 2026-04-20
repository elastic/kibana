/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { SLO_ALERTS_EMBEDDABLE_ID } from '../../../common/embeddables/alerts/constants';
import { getAlertsEmbeddableSchema } from './alerts_schema';
import { getTransforms } from '../../../common/embeddables/alerts/transforms/transforms';

/**
 * Registers the schema and transforms for the SLO Alerts embeddable
 */
export const registerAlertsEmbeddableTransforms = (embeddable: EmbeddableSetup): void => {
  embeddable.registerTransforms(SLO_ALERTS_EMBEDDABLE_ID, {
    getSchema: getAlertsEmbeddableSchema,
    getTransforms,
  });
};
