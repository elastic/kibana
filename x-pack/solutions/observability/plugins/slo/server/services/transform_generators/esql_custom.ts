/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TransformPutTransformRequest } from '@elastic/elasticsearch/lib/api/types';
import { TransformGenerator } from '.';
import type { SLODefinition } from '../../domain/models';

/**
 * ESQL custom SLOs do not use transforms for SLI rollup — they use Kibana Workflows instead.
 * This stub satisfies the TransformGenerator interface so the type registry is complete,
 * but getTransformParams always throws to prevent accidental transform creation.
 */
export class EsqlCustomTransformGenerator extends TransformGenerator {
  public async getTransformParams(_slo: SLODefinition): Promise<TransformPutTransformRequest> {
    throw new Error(
      'ESQL custom SLOs use Kibana Workflows for SLI evaluation, not transforms. ' +
        'Use WorkflowManager instead of TransformManager for this indicator type.'
    );
  }
}
