/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleKqlQuery,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { simpleDiffAlgorithm } from './simple_diff_algorithm';

/**
 * Diff algorithm for all kql query types (`inline_query` and `saved_query`)
 */
export const kqlQueryDiffAlgorithm = <TValue extends RuleKqlQuery>(
  versions: ThreeVersionsOf<TValue>
) => simpleDiffAlgorithm<TValue>(versions);
