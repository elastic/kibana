/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleEsqlQuery,
  ThreeVersionsOf,
} from '../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { simpleDiffAlgorithm } from './simple_diff_algorithm';

/**
 * Diff algorithm for esql query types
 */
export const esqlQueryDiffAlgorithm = (versions: ThreeVersionsOf<RuleEsqlQuery>) =>
  simpleDiffAlgorithm<RuleEsqlQuery>(versions);
