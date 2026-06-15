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

  it('maps Team:Defend Workflows label to XDR org team', () => {
    const result = attributeTeam({ labels: ['Team:Defend Workflows'] });
    expect(result.orgTeams).toEqual(['xdr']);
  });

  it('maps Rules Management project team field to SIEM org team', () => {
    const result = attributeTeam({ projectTeam: 'Rules Management' });
    expect(result.orgTeams).toEqual(['siem']);
  });

  it('maps spaced Detections/Response label to SIEM org team', () => {
    const result = attributeTeam({ labels: ['Team: Detections/Response'] });
    expect(result.orgTeams).toEqual(['siem']);
  });

  it('maps Customer Support label to Platform Delivery org team', () => {
    const result = attributeTeam({ labels: ['Customer Support', 'severity:high'] });
    expect(result.orgTeams).toEqual(['pds']);
    expect(result.engineeringTeam).toBe('Customer Support');
  });

  it('maps Team: Sec Eng Productivity label to Platform Delivery org team', () => {
    const result = attributeTeam({ labels: ['Team: Sec Eng Productivity'] });
    expect(result.orgTeams).toEqual(['pds']);
  });

  it('maps Security Deployment labels to Platform Delivery org team', () => {
    expect(attributeTeam({ labels: ['Team:Security-Deployment and Devices'] }).orgTeams).toEqual([
      'pds',
    ]);
    expect(attributeTeam({ labels: ['security-pds-deployment'] }).orgTeams).toEqual(['pds']);
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

  it('does not treat all tickets as AI-generated when no ai-generated labels exist', () => {
    const tickets = rollupTickets([
      { state: 'OPEN', labels: ['enhancement'], assignees: ['dev1'] },
      { state: 'CLOSED', labels: [], assignees: ['dev2'] },
    ]);
    expect(tickets).toMatchObject({ total: 2, aiGen: 0 });
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

    expect(doc.roadmap).toMatchObject({ id: 'workflows', title: 'Elastic Workflows (Automation) Roadmap' });
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

  it('tags release.deck_feature when a GitHub epic key matches the Workflows deck correlation', () => {
    const doc = buildEpicPhaseDocument({
      epicKey: '[Epic] Workflow Versioning',
      displayId: 'WF-V',
      title: 'Workflow Versioning',
      projectItemId: 'PVT_item_wf',
      projectNumber: 705,
      fields: { Team: 'One Workflow', Epic: '[Epic] Workflow Versioning', Status: 'In Progress' },
      childIssues: [],
      childPullRequests: [],
      ticketsByRepo: [],
    });

    expect(doc.roadmap).toMatchObject({ id: 'workflows' });
    expect(doc.release).toMatchObject({
      deck_feature: 'Workflow Versioning',
      deck_bucket: 'next',
    });
  });

  it('includes Security Intelligence when child issues carry GenAI labels alongside SIEM labels', () => {
    const doc = buildEpicPhaseDocument({
      epicKey: 'Agentic search for detection rules',
      displayId: 'Agentic search for detection rules',
      title: 'Agentic search for detection rules',
      projectItemId: 'PVT_item_1',
      projectNumber: 705,
      fields: {
        Team: 'Rules Management',
        Epic: 'Agentic search for detection rules',
        'Product Initiative': 'Improve detection rules discovery, selection and search',
        Status: 'In Progress',
      },
      childIssues: [
        {
          state: 'OPEN',
          labels: [
            'Team: SecuritySolution',
            'GenAI',
            'Team:Detection Engineering',
            'Team:Detections and Resp',
          ],
          assignees: ['dev1'],
          projectStatus: 'In Progress',
        },
      ],
      childPullRequests: [],
      ticketsByRepo: [],
    });

    expect(doc.teams).toMatchObject({
      contributing_org_teams: expect.arrayContaining(['si', 'siem']),
      cross_team: true,
      team_count: 2,
    });
  });

  it('includes XDR when child issues carry Defend Workflows labels', () => {
    const doc = buildEpicPhaseDocument({
      epicKey: 'Functionality',
      displayId: 'Functionality',
      title: 'Functionality',
      projectItemId: 'PVT_item_1',
      projectNumber: 705,
      fields: {
        Epic: 'Functionality',
        Status: 'In Progress',
      },
      childIssues: [
        {
          state: 'OPEN',
          labels: ['Team:Fleet', 'Team:Defend Workflows', 'Team:Security'],
          assignees: ['dev1'],
          projectStatus: 'In Progress',
        },
      ],
      childPullRequests: [],
      ticketsByRepo: [],
    });

    expect(doc.teams).toMatchObject({
      contributing_org_teams: expect.arrayContaining(['xdr']),
    });
  });

  it('includes Platform Delivery when child issues carry Sec Eng Productivity labels', () => {
    const doc = buildEpicPhaseDocument({
      epicKey: 'Support Shift Duties',
      displayId: 'Support Shift Duties',
      title: 'Support Shift Duties',
      projectItemId: 'PVT_item_1',
      projectNumber: 705,
      fields: {
        Epic: 'Support Shift Duties',
        Status: 'In Progress',
      },
      childIssues: [
        {
          state: 'OPEN',
          labels: ['Team: Sec Eng Productivity'],
          assignees: ['dev1'],
          projectStatus: 'Todo',
        },
      ],
      childPullRequests: [],
      ticketsByRepo: [],
    });

    expect(doc.teams).toMatchObject({
      contributing_org_teams: expect.arrayContaining(['pds']),
    });
  });
});
