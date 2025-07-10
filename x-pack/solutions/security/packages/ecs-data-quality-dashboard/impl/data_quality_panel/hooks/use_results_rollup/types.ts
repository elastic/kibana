/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnCheckCompleted, PatternRollup } from '../../types';

export interface UseResultsRollupReturnValue {
  onCheckCompleted: OnCheckCompleted;
  patternIndexNames: Record<string, string[]>;
  patternRollups: Record<string, PatternRollup>;
  totalDocsCount: number | undefined;
  totalIncompatible: number | undefined;
  totalIndices: number | undefined;
  totalIndicesChecked: number | undefined;
  totalSameFamily: number | undefined;
  totalSizeInBytes: number | undefined;
  updatePatternIndexNames: ({
    indexNames,
    pattern,
  }: {
    indexNames: string[];
    pattern: string;
  }) => void;
  updatePatternRollup: (patternRollup: PatternRollup) => void;
}
