/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildMockMitreTacticSummary,
  buildMockMitreTechniqueSummary,
} from '@kbn/security-mitre-attack-common';
import {
  getMockCoverageOverviewTactics,
  getMockCoverageOverviewTechniques,
  getMockCoverageOverviewSubtechniques,
} from '../../model/coverage_overview/__mocks__';
import { buildCoverageOverviewMitreGraph } from './build_coverage_overview_mitre_graph';

describe('buildCoverageOverviewMitreGraph', () => {
  it('builds domain model', () => {
    const mockTactics = getMockCoverageOverviewTactics();
    const mockTechniques = getMockCoverageOverviewTechniques();
    const mockSubtechniques = getMockCoverageOverviewSubtechniques();
    const model = buildCoverageOverviewMitreGraph(mockTactics, mockTechniques, mockSubtechniques);

    expect(model).toEqual([
      {
        id: 'TA001',
        name: 'Tactic 1',
        reference: 'https://some-link/TA001',
        techniques: [
          {
            id: 'T001',
            name: 'Technique 1',
            reference: 'https://some-link/T001',
            subtechniques: [
              {
                id: 'T001.001',
                name: 'Subtechnique 1',
                reference: 'https://some-link/T001/001',
                enabledRules: [],
                disabledRules: [],
                availableRules: [],
              },
              {
                id: 'T001.002',
                name: 'Subtechnique 2',
                reference: 'https://some-link/T001/002',
                enabledRules: [],
                disabledRules: [],
                availableRules: [],
              },
            ],
            enabledRules: [],
            disabledRules: [],
            availableRules: [],
          },
          {
            id: 'T002',
            name: 'Technique 2',
            reference: 'https://some-link/T002',
            subtechniques: [],
            enabledRules: [],
            disabledRules: [],
            availableRules: [],
          },
        ],
        enabledRules: [],
        disabledRules: [],
        availableRules: [],
      },
      {
        id: 'TA002',
        name: 'Tactic 2',
        reference: 'https://some-link/TA002',
        techniques: [
          {
            id: 'T002',
            name: 'Technique 2',
            reference: 'https://some-link/T002',
            subtechniques: [],
            enabledRules: [],
            disabledRules: [],
            availableRules: [],
          },
        ],
        enabledRules: [],
        disabledRules: [],
        availableRules: [],
      },
    ]);
  });

  it('sorts tactics by position ascending', () => {
    const shuffledTactics = [
      buildMockMitreTacticSummary({
        id: 'TA003',
        name: 'Tactic 3',
        reference: 'https://some-link/TA003',
        position: 2,
      }),
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

    const model = buildCoverageOverviewMitreGraph(shuffledTactics, [], []);
    expect(model.map((t) => t.id)).toEqual(['TA001', 'TA002', 'TA003']);
  });

  it('does not mutate the input tactics array', () => {
    const tactics = [
      buildMockMitreTacticSummary({ id: 'TA002', position: 1 }),
      buildMockMitreTacticSummary({ id: 'TA001', position: 0 }),
    ];
    const originalOrder = tactics.map((t) => t.id);
    buildCoverageOverviewMitreGraph(tactics, [], []);
    expect(tactics.map((t) => t.id)).toEqual(originalOrder);
  });

  it('places a multi-tactic technique under every tactic in tactic_ids', () => {
    const tactics = [
      buildMockMitreTacticSummary({ id: 'TA001', position: 0 }),
      buildMockMitreTacticSummary({ id: 'TA002', position: 1 }),
    ];
    const techniques = [
      buildMockMitreTechniqueSummary({ id: 'T001', tactic_ids: ['TA001', 'TA002'] }),
    ];

    const model = buildCoverageOverviewMitreGraph(tactics, techniques, []);
    expect(model[0].techniques.map((t) => t.id)).toContain('T001');
    expect(model[1].techniques.map((t) => t.id)).toContain('T001');
  });

  it('does not place a technique under a tactic not in its tactic_ids', () => {
    const tactics = [
      buildMockMitreTacticSummary({ id: 'TA001', position: 0 }),
      buildMockMitreTacticSummary({ id: 'TA002', position: 1 }),
    ];
    const techniques = [buildMockMitreTechniqueSummary({ id: 'T001', tactic_ids: ['TA001'] })];

    const model = buildCoverageOverviewMitreGraph(tactics, techniques, []);
    // TA001 gets T001
    expect(model[0].techniques.map((t) => t.id)).toContain('T001');
    // TA002 does NOT get T001
    expect(model[1].techniques.map((t) => t.id)).not.toContain('T001');
  });
});
