/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEAM_DIMENSION_SEED } from '../config/team_dimension';
import { epicBelongsToOrgTeam, epicBelongsToSubteam, buildSubteamCards } from './team_subteams';

describe('team_subteams', () => {
  const siemRecord = TEAM_DIMENSION_SEED.find((record) => record.org_team.key === 'siem');

  it('treats missing contributing org teams as empty when matching org team', () => {
    expect(
      epicBelongsToOrgTeam(
        {
          epicKey: 'Epic without contributors',
          ownOrgTeam: 'siem',
          contributingOrgTeams: undefined as unknown as readonly string[],
          contributingEngineeringTeams: [],
        },
        'siem'
      )
    ).toBe(true);

    expect(
      epicBelongsToOrgTeam(
        {
          epicKey: 'Epic without contributors',
          ownOrgTeam: 'sde',
          contributingOrgTeams: undefined as unknown as readonly string[],
          contributingEngineeringTeams: [],
        },
        'siem'
      )
    ).toBe(false);
  });

  it('matches One Workflow epics by engineering team and epic key prefix', () => {
    expect(siemRecord).toBeDefined();
    const subteam = { name: 'One Workflow', project_team_values: ['One Workflow'] };

    expect(
      epicBelongsToSubteam(
        {
          epicKey: '[One Workflow] G.A. readiness',
          ownOrgTeam: 'siem',
          contributingOrgTeams: ['siem'],
          ownEngineeringTeam: 'One Workflow',
          contributingEngineeringTeams: [],
        },
        subteam,
        'siem'
      )
    ).toBe(true);

    expect(
      epicBelongsToSubteam(
        {
          epicKey: '[One Workflow] G.A. readiness',
          ownOrgTeam: 'siem',
          contributingOrgTeams: ['siem'],
          contributingEngineeringTeams: [],
        },
        subteam,
        'siem'
      )
    ).toBe(true);
  });

  it('builds subteam cards for SIEM with One Workflow metrics', () => {
    expect(siemRecord).toBeDefined();
    const cards = buildSubteamCards({
      teamRecord: siemRecord!,
      epics: [
        {
          epicKey: '[One Workflow] G.A. readiness',
          ownOrgTeam: 'siem',
          contributingOrgTeams: ['siem'],
          ownEngineeringTeam: 'One Workflow',
          contributingEngineeringTeams: [],
          gatesPassedPct: 50,
          phases: { p4_tickets: { done: 2, total: 4, ai_gen: 3 } },
        },
        {
          epicKey: 'Automation - CDR workflows',
          ownOrgTeam: 'sde',
          contributingOrgTeams: ['sde'],
          contributingEngineeringTeams: [],
        },
      ],
    });

    const oneWorkflow = cards.find((card) => card.key === 'one-workflow');
    expect(oneWorkflow?.epicCount).toBe(1);
    expect(oneWorkflow?.githubTeamUrls).toContain('https://github.com/orgs/elastic/teams/one-workflow');
    expect(oneWorkflow?.githubProjects[0]?.number).toBe(705);
  });
});
