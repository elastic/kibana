/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildMockMitreTacticSummary,
  buildMockMitreTechniqueSummary,
  buildMockMitreSubtechniqueSummary,
  buildMockMitreEntitySummaryBuckets,
} from '@kbn/security-mitre-attack-common';
import type { MitreEntitySummaryBuckets } from '@kbn/security-mitre-attack-common';
import type { MitreConfiguration } from './use_mitre_configuration';

export const mockTactic = buildMockMitreTacticSummary();
export const mockTechnique = buildMockMitreTechniqueSummary();
export const mockSubtechnique = buildMockMitreSubtechniqueSummary();

export const mockMitreEntitySummaryBuckets = (): MitreEntitySummaryBuckets =>
  buildMockMitreEntitySummaryBuckets({
    tactics: [mockTactic],
    techniques: [mockTechnique],
    subtechniques: [mockSubtechnique],
  });

/** Returns an empty (loading-not-started or error) MitreConfiguration. */
export const createEmptyMitreConfiguration = (
  overrides: Partial<MitreConfiguration> = {}
): MitreConfiguration => ({
  tactics: [],
  techniques: [],
  subtechniques: [],
  frameworkVersion: undefined,
  isLoading: false,
  isError: false,
  ...overrides,
});

/** Returns a populated MitreConfiguration with sample data. */
export const createPopulatedMitreConfiguration = (
  overrides: Partial<MitreConfiguration> = {}
): MitreConfiguration => ({
  tactics: [mockTactic],
  techniques: [mockTechnique],
  subtechniques: [mockSubtechnique],
  frameworkVersion: '16.1',
  isLoading: false,
  isError: false,
  ...overrides,
});
