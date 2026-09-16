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
} from '@kbn/security-mitre-attack-common';
import type {
  MitreTacticSummary,
  MitreTechniqueSummary,
  MitreSubtechniqueSummary,
} from '@kbn/security-mitre-attack-common';
import type { CoverageOverviewDashboard } from '../dashboard';
import type { CoverageOverviewMitreSubTechnique } from '../mitre_subtechnique';
import type { CoverageOverviewMitreTactic } from '../mitre_tactic';
import type { CoverageOverviewMitreTechnique } from '../mitre_technique';
import type { CoverageOverviewRule } from '../rule';

export const getMockCoverageOverviewRule = (): CoverageOverviewRule => ({
  id: 'rule-id',
  name: 'test rule',
});

const mockCoverageOverviewRules = {
  enabledRules: [getMockCoverageOverviewRule()],
  disabledRules: [getMockCoverageOverviewRule()],
  availableRules: [getMockCoverageOverviewRule()],
};

export const getMockCoverageOverviewMitreTactic = (): CoverageOverviewMitreTactic => ({
  id: 'tactic-id',
  name: 'test tactic',
  reference: 'http://test-link',
  techniques: [],
  ...mockCoverageOverviewRules,
});

export const getMockCoverageOverviewMitreTechnique = (): CoverageOverviewMitreTechnique => ({
  id: 'technique-id',
  name: 'test technique',
  reference: 'http://test-link',
  subtechniques: [],
  ...mockCoverageOverviewRules,
});

export const getMockCoverageOverviewMitreSubTechnique = (): CoverageOverviewMitreSubTechnique => ({
  id: 'sub-technique-id',
  name: 'test sub-technique',
  reference: 'http://test-link',
  ...mockCoverageOverviewRules,
});

export const getMockCoverageOverviewDashboard = (): CoverageOverviewDashboard => ({
  mitreTactics: [getMockCoverageOverviewMitreTactic()],
  unmappedRules: {
    enabledRules: [],
    disabledRules: [],
    availableRules: [],
  },
  invalidlyMappedRules: {
    enabledRules: [],
    disabledRules: [],
  },
  metrics: {
    totalRulesCount: 3,
    totalEnabledRulesCount: 1,
  },
});

export const getMockCoverageOverviewTactics = (): MitreTacticSummary[] => [
  buildMockMitreTacticSummary({
    id: 'TA001',
    name: 'Tactic 1',
    reference: 'https://some-link/TA001',
    position: 0,
  }),
  buildMockMitreTacticSummary({
    id: 'TA002',
    name: 'Tactic 2',
    reference: 'https://some-link/TA002',
    position: 1,
  }),
];

export const getMockCoverageOverviewTechniques = (): MitreTechniqueSummary[] => [
  buildMockMitreTechniqueSummary({
    id: 'T001',
    name: 'Technique 1',
    reference: 'https://some-link/T001',
    tactic_ids: ['TA001'],
  }),
  buildMockMitreTechniqueSummary({
    id: 'T002',
    name: 'Technique 2',
    reference: 'https://some-link/T002',
    tactic_ids: ['TA001', 'TA002'],
  }),
];

export const getMockCoverageOverviewSubtechniques = (): MitreSubtechniqueSummary[] => [
  buildMockMitreSubtechniqueSummary({
    id: 'T001.001',
    name: 'Subtechnique 1',
    reference: 'https://some-link/T001/001',
    tactic_ids: ['TA001'],
    technique_id: 'T001',
  }),
  buildMockMitreSubtechniqueSummary({
    id: 'T001.002',
    name: 'Subtechnique 2',
    reference: 'https://some-link/T001/002',
    tactic_ids: ['TA001'],
    technique_id: 'T001',
  }),
];
