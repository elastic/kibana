/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary } from '../../common/api/types';
import {
  buildPortfolioSummary,
  buildTeamCards,
  groupEpicsByRoadmap,
  mapEpicPhaseDocument,
  mapTeamDimensionDocument,
} from './sdlc_api_transforms';

describe('sdlc_api_transforms', () => {
  const sampleEpic: SdlcEpicPhaseSummary = {
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
      ownEngineeringTeam: 'Core Analysis',
      contributingOrgTeams: ['siem', 'si'],
      contributingEngineeringTeams: ['Core Analysis'],
      crossTeam: true,
      teamCount: 2,
    },
    links: {},
    phases: {
      p4_tickets: { gate: 'warn', done: 14, total: 17, ai_gen: 14 },
      p5_prs: { gate: 'warn', merged: 2, total: 3 },
    },
    ticketsByRepo: [
      {
        repo: 'elastic/kibana',
        items: [{ issueRef: '#11201', number: 11201, title: 'Workflow fetch', status: 'open', prRefs: [] }],
      },
    ],
  };

  it('maps epic phase documents', () => {
    const mapped = mapEpicPhaseDocument('epic:dlvp:phase-a', {
      epic: { key: 'Phase A', display_id: '#4401', title: 'Phase A — engineering core' },
      roadmap: { id: 'dlvp', product: 'Sec AI Dev Accelerators' },
      rollup: { coverage_pct: 85, status: 'in-progress', gates_passed_pct: 50 },
      teams: {
        own_org_team: 'siem',
        own_engineering_team: 'Core Analysis',
        contributing_org_teams: ['siem'],
        contributing_engineering_teams: ['Core Analysis'],
        cross_team: false,
        team_count: 1,
      },
    });

    expect(mapped?.epicKey).toBe('Phase A');
    expect(mapped?.coveragePct).toBe(85);
  });

  it('maps team dimension documents', () => {
    const mapped = mapTeamDimensionDocument({
      org_team: { key: 'siem', name: 'SIEM', members_count: 65 },
      subteams: ['Detection Engine'],
      aliases: {
        project_team_values: ['Core Analysis'],
        github_labels: ['Team:Core Analysis'],
        github_org_slugs: ['core-analysis'],
      },
    });

    expect(mapped).toEqual({
      org_team: { key: 'siem', name: 'SIEM', members_count: 65 },
      subteams: ['Detection Engine'],
      aliases: {
        project_team_values: ['Core Analysis'],
        github_labels: ['Team:Core Analysis'],
        github_org_slugs: ['core-analysis'],
      },
    });
    expect(mapTeamDimensionDocument(undefined)).toBeUndefined();
    expect(mapTeamDimensionDocument({ org_team: { key: 'siem' } })).toBeUndefined();
  });

  it('groups epics by roadmap and builds portfolio summary', () => {
    const groups = groupEpicsByRoadmap([sampleEpic]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.id).toBe('dlvp');
    expect(groups[0]?.coveragePct).toBe(85);

    const summary = buildPortfolioSummary([sampleEpic]);
    expect(summary.epicCount).toBe(1);
    expect(summary.ticketsWithoutPrCount).toBe(1);
  });

  it('builds team cards from epic rollups', () => {
    const cards = buildTeamCards({
      epics: [sampleEpic],
      teamRecords: [
        {
          org_team: { key: 'siem', name: 'SIEM', members_count: 65 },
          subteams: [],
          aliases: { project_team_values: [], github_labels: [], github_org_slugs: [] },
        },
      ],
    });

    expect(cards[0]?.epicCount).toBe(1);
    expect(cards[0]?.ticketsTotal).toBe(17);
    expect(cards[0]?.ticketsDone).toBe(14);
  });
});
