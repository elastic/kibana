/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary, SdlcRoadmapGroup } from '../../../../common/api/types';
import { buildPipelineDisplayGroups, filterEpicsByPipelineScope } from './pipeline_scope';

const sampleEpic = (overrides: Partial<SdlcEpicPhaseSummary> = {}): SdlcEpicPhaseSummary => ({
  id: 'epic:workflows:demo',
  epicKey: 'DEMO',
  displayId: 'DEMO-1',
  title: 'Demo epic',
  summary: 'Demo',
  owner: 'owner',
  status: 'open',
  coveragePct: 50,
  deliveryCoveragePct: 50,
  gatesPassedPct: 50,
  roadmap: {
    id: 'workflows',
    title: 'Elastic Workflows (Automation) Roadmap',
    product: 'Elastic Workflows',
  },
  teams: {
    ownOrgTeam: 'siem',
    ownEngineeringTeam: 'One Workflow',
    contributingOrgTeams: ['siem'],
    contributingEngineeringTeams: [],
    crossTeam: false,
    teamCount: 1,
  },
  phases: {},
  ticketsByRepo: [],
  ...overrides,
});

const roadmaps: SdlcRoadmapGroup[] = [
  {
    id: 'workflows',
    title: 'Elastic Workflows (Automation) Roadmap',
    product: 'Elastic Workflows',
    coveragePct: 50,
    epicCount: 1,
    epics: [sampleEpic()],
  },
  {
    id: 'unmapped',
    title: '(fips): Legal requirements',
    product: 'Unknown',
    coveragePct: 10,
    epicCount: 1,
    epics: [
      sampleEpic({
        id: 'epic:unmapped:fips',
        epicKey: 'FIPS',
        title: '(fips): Legal requirements',
        roadmap: { id: 'unmapped', title: '(fips): Legal requirements', product: 'Unknown' },
        teams: {
          contributingOrgTeams: [],
          crossTeam: false,
          teamCount: 0,
        },
      }),
    ],
  },
];

describe('pipeline_scope', () => {
  it('groups default view by org team and subteam instead of per-epic roadmap tabs', () => {
    const groups = buildPipelineDisplayGroups(roadmaps, {
      orgTeamKey: '',
      subteamKey: '',
      productRoadmapId: '',
    });

    expect(groups.some((group) => group.title.includes('SIEM'))).toBe(true);
    expect(groups.some((group) => group.title.includes('(fips)'))).toBe(false);
  });

  it('filters to a product roadmap id', () => {
    const filtered = filterEpicsByPipelineScope(
      roadmaps.flatMap((roadmap) => roadmap.epics),
      {
        orgTeamKey: '',
        subteamKey: '',
        productRoadmapId: 'workflows',
      }
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.roadmap.id).toBe('workflows');
  });
});
