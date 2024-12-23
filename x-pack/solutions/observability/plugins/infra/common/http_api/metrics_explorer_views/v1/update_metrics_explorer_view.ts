/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  metricsExplorerViewAttributesRT,
  metricsExplorerViewRT,
} from '../../../metrics_explorer_views';

export const updateMetricsExplorerViewAttributesRequestPayloadRT = rt.intersection([
  metricsExplorerViewAttributesRT,
  rt.partial({ isDefault: rt.undefined, isStatic: rt.undefined }),
]);

export type UpdateMetricsExplorerViewAttributesRequestPayload = rt.TypeOf<
  typeof updateMetricsExplorerViewAttributesRequestPayloadRT
>;

export const updateMetricsExplorerViewRequestPayloadRT = rt.type({
  attributes: updateMetricsExplorerViewAttributesRequestPayloadRT,
});

export type UpdateMetricsExplorerViewResponsePayload = rt.TypeOf<typeof metricsExplorerViewRT>;
