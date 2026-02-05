/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Optionally, re-export the entire set of types. Interfaces and types declared after this will override v1 declarations.
import { schema } from '@kbn/config-schema';
import type { BenchmarksCisId } from '@kbn/cloud-security-posture-common';
import type { BenchmarkScore } from './v1';

export type { BenchmarkScore } from './v1';

export interface Benchmark {
  id: BenchmarksCisId;
  name: string;
  version: string;
  score: BenchmarkScore;
  evaluation: number;
}

export interface GetBenchmarkResponse {
  items: Benchmark[];
}

export const benchmarkResponseSchema = () =>
  schema.object({
    items: schema.arrayOf(
      schema.object({
        id: schema.oneOf([
          schema.literal('cis_k8s'),
          schema.literal('cis_azure'),
          schema.literal('cis_aws'),
          schema.literal('cis_eks'),
          schema.literal('cis_gcp'),
        ]),
        name: schema.string(),
        version: schema.string(),
        score: schema.object({
          postureScore: schema.number({ defaultValue: 0, min: 0 }),
          resourcesEvaluated: schema.number({ defaultValue: 0, min: 0 }),
          totalFailed: schema.number({ defaultValue: 0, min: 0 }),
          totalFindings: schema.number({ defaultValue: 0, min: 0 }),
          totalPassed: schema.number({ defaultValue: 0, min: 0 }),
        }),
        evaluation: schema.number({ defaultValue: 0, min: 0 }),
      }),
      // maxSize is set to 5 as there are only 5 benchmark types (cis_k8s, cis_azure, cis_aws, cis_eks, cis_gcp)
      { maxSize: 5 }
    ),
  });
