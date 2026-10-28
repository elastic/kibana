/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken } from '@kbn/core-di';
import type { EsSearchClient } from '../workflows/step_types/build_alert_entity_graph_step/types';

/** Same stable id as the Workflows Extensions contribution kind. */
export const WorkflowStepKind = createToken<unknown>('workflows.step');

export interface AlertGraphEsApi {
  forScope(scopeId: string): Promise<EsSearchClient>;
}

export const AlertGraphEsToken = createToken<AlertGraphEsApi>('security.alertGraphEs');
