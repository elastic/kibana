/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { buildEpicPhaseDocument } from './build_epic_phases';
import { computeP4Gate, computeP5Gate, rollupTickets } from './phase_gates';
import { attributeTeam } from './team_attribution';

describe('team attribution', () => {
  it('maps project team Core Analysis to SIEM org team', () => {
    const result = attributeTeam({ projectTeam: 'Core Analysis' });
    expect(result.orgTeams).toEqual(['siem']);
    expect(result.attributionSource).toBe('project_field');
  });

  it('maps Team:One Workflow label to SIEM org team', () => {
    const result = attributeTeam({ labels: ['Team:One Workflow', 'enhancement'] });
    expect(result.orgTeams).toEqual(['siem']);
  });

  it('maps Team: TRADE label to Security Intelligence org team', () => {
    const result = attributeTeam({ labels: ['Team: TRADE', 'enhancement'] });
    expect(result.orgTeams).toEqual(['si']);
    expect(result.attributionSource).toBe('github_label');
  });

  it('maps spaced Team: GenAI label to Security Intelligence org team', () => {
    const result = attributeTeam({ labels: ['Team: GenAI'] });
    expect(result.orgTeams).toEqual(['si']);
  });

  it('maps bare GenAI label to Security Intelligence org team', () => {
    const result = attributeTeam({ labels: ['GenAI', 'enhancement'] });
    expect(result.orgTeams).toEqual(['si']);
    expect(result.engineeringTeam).toBe('GenAI');
  });

  it('maps TRaDE project team field to Security Intelligence org team', () => {
    const result = attributeTeam({ projectTeam: 'TRaDE' });
    expect(result.orgTeams).toEqual(['si']);
    expect(result.attributionSource).toBe('project_field');
  });
});

describe('phase gates', () => {
  it('computes warn P4 when tickets are partially done', () => {
    const tickets = rollupTickets([
      { state: 'CLOSED', labels: ['ai-generated'], assignees: ['dev1'] },
      { state: 'OPEN', labels: ['ai-generated'], assignees: ['dev2'] },
    ]);
    expect(tickets.done).toBe(1);
    expect(computeP4Gate(tickets)).toBe('warn');
  });

  it('computes fail P5 when tickets exist but no PRs', () => {
    const tickets = rollupTickets([{ state: 'OPEN', labels: [] }]);
    expect(computeP5Gate(tickets, { total: 0, merged: 0, open: 0, closedUnmerged: 0 })).toBe(
      'fail'
    );
  });
});

describe('buildEpicPhaseDocument', () => {
  it('builds an epic phase document with P4/P5 populated', () => {
    const doc = buildEpicPhaseDocument({
      epicKey: 'Entity Store - Performance',
      displayId: '#4401',
      title: 'Entity Store performance',
      projectItemId: 'PVT_item_1',
      projectNumber: 705,
      fields: {
        Team: 'Core Analysis',
        Epic: 'Entity Store - Performance',
        'Product Initiative': 'Enable Intelligent Workflow Automation',
        'Ticket Type': 'Epic',
        Status: 'In Progress',
      },
      childIssues: [
        {
          state: 'CLOSED',
          labels: ['Team:Core Analysis'],
          assignees: ['dev1'],
          projectStatus: 'Done',
        },
        {
          state: 'OPEN',
          labels: ['Team:Core Analysis'],
          assignees: ['dev2'],
          projectStatus: 'In Progress',
          linkedPrOpenCount: 1,
        },
      ],
      childPullRequests: [{ merged: true, state: 'MERGED' }],
      ticketsByRepo: [],
    });

    expect(doc.roadmap).toMatchObject({ id: 'dlvp' });
    expect(doc.teams).toMatchObject({ own_org_team: 'siem', cross_team: false });
    expect(doc.phases).toMatchObject({
      p4_tickets: expect.objectContaining({ gate: 'warn', total: 2 }),
      p5_prs: expect.objectContaining({ gate: 'warn', merged: 1 }),
    });
    expect(doc.rollup).toMatchObject({
      delivery_coverage_pct: expect.any(Number),
      status: 'in-progress',
    });
  });
});
