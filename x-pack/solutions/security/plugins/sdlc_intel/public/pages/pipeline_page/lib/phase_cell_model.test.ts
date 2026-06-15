/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary } from '../../../../common/api/types';
import { buildPhaseCells, getCurrentPhaseLabel } from './phase_cell_model';

const sampleEpic = (): SdlcEpicPhaseSummary => ({
  id: 'epic:dlvp:phase-a',
  epicKey: 'Phase A',
  displayId: '#4401',
  title: 'Phase A — engineering core',
  status: 'in-progress',
  coveragePct: 85,
  deliveryCoveragePct: 85,
  gatesPassedPct: 50,
  roadmap: { id: 'dlvp', title: 'Lifecycle visibility', product: 'Sec AI Dev Accelerators' },
  teams: {
    ownOrgTeam: 'siem',
    contributingOrgTeams: ['siem'],
    crossTeam: false,
    teamCount: 1,
  },
  links: {
    prdUrl: 'https://example.com/prd',
    archUrl: 'https://example.com/arch',
  },
  phases: {
    p1_prd: { gate: 'ns' },
    p2_arch: { gate: 'ns' },
    p3_ai_coverage: { gate: 'ns' },
    p4_tickets: {
      gate: 'warn',
      total: 17,
      done: 14,
      ai_gen: 14,
      eng_validated: 12,
    },
    p5_prs: {
      gate: 'warn',
      total: 3,
      merged: 2,
      open: 1,
    },
    p6_defects: { gate: 'ns' },
    p7_production: { gate: 'ns' },
    p8_telemetry: { gate: 'ns' },
  },
  ticketsByRepo: [],
});

describe('phase_cell_model', () => {
  it('builds P4/P5 summaries and link-aware planning cells', () => {
    const cells = buildPhaseCells(sampleEpic());

    expect(cells[0]?.summary).toBe('Linked');
    expect(cells[1]?.summary).toBe('Linked');
    expect(cells[3]?.summary).toBe('14/17 done');
    expect(cells[4]?.summary).toBe('2/3 merged');
    expect(cells[5]?.summary).toBe('');
  });

  it('derives current phase from last non-ns gate', () => {
    expect(getCurrentPhaseLabel(buildPhaseCells(sampleEpic()))).toBe('P5');
  });
});
