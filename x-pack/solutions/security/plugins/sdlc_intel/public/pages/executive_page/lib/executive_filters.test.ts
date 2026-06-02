/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary, SdlcRoadmapGroup } from '../../../../common/api/types';
import { filterRoadmaps, getFilteredSummary } from './executive_filters';

const sampleEpic = (overrides: Partial<SdlcEpicPhaseSummary> = {}): SdlcEpicPhaseSummary => ({
  id: 'epic:dlvp:phase-a',
  epicKey: 'Phase A',
  displayId: '#4401',
  title: 'Phase A — engineering core',
  owner: 'Y. Naumenko',
  status: 'in-progress',
  coveragePct: 85,
  deliveryCoveragePct: 85,
  gatesPassedPct: 50,
  roadmap: { id: 'dlvp', title: 'Lifecycle visibility', product: 'Sec AI Dev Accelerators' },
  teams: {
    ownOrgTeam: 'siem',
    ownEngineeringTeam: 'One Workflow',
    contributingOrgTeams: ['siem'],
    contributingEngineeringTeams: ['One Workflow'],
    crossTeam: false,
    teamCount: 1,
  },
  links: { prdUrl: 'https://example.com/prd' },
  phases: {},
  ticketsByRepo: [
    {
      repo: 'elastic/kibana',
      items: [
        {
          issueRef: '#11201',
          number: 11201,
          title: 'Workflow fetch PRs',
          status: 'open',
          prRefs: [],
        },
      ],
    },
  ],
  ...overrides,
});

describe('executive_filters', () => {
  it('filters epics by owner and coverage', () => {
    const roadmaps: SdlcRoadmapGroup[] = [
      {
        id: 'dlvp',
        title: 'Lifecycle visibility',
        product: 'Sec AI Dev Accelerators',
        coveragePct: 85,
        epicCount: 2,
        epics: [
          sampleEpic(),
          sampleEpic({
            id: 'epic:dlvp:phase-b',
            epicKey: 'Phase B',
            title: 'Phase B',
            owner: 'N. Oren',
            coveragePct: 15,
            status: 'open',
            links: {},
          }),
        ],
      },
    ];

    const filtered = filterRoadmaps(roadmaps, {
      search: '',
      product: '',
      owner: 'N. Oren',
      coverage: 'risk',
      engineeringTeam: '',
      deckBucket: '',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.epics).toHaveLength(1);
    expect(filtered[0]?.epics[0]?.epicKey).toBe('Phase B');
  });

  it('builds filtered summary metrics', () => {
    const result = getFilteredSummary(
      {
        sync: {
          healthy: true,
          completedProjects: 1,
          epicPhaseCount: 1,
          relationshipCount: 10,
        },
        summary: {
          portfolioCoveragePct: 85,
          epicStatusCounts: { closed: 0, inProgress: 1, open: 0 },
          epicCount: 1,
          atRiskEpicCount: 0,
          ticketsWithoutPrCount: 1,
        },
        roadmaps: [
          {
            id: 'dlvp',
            title: 'Lifecycle visibility',
            product: 'Sec AI Dev Accelerators',
            coveragePct: 85,
            epicCount: 1,
            epics: [sampleEpic()],
          },
        ],
      },
      {
        search: '',
        product: '',
        owner: '',
        coverage: '',
        engineeringTeam: '',
        deckBucket: '',
      }
    );

    expect(result.summary.epicCount).toBe(1);
    expect(result.derived.prdLinkedCount).toBe(1);
    expect(result.derived.openTicketCount).toBe(1);
  });

  it('excludes epics outside Security org teams', () => {
    const roadmaps: SdlcRoadmapGroup[] = [
      {
        id: 'unmapped',
        title: 'FIPS binaries',
        product: 'Unknown',
        coveragePct: 29,
        epicCount: 1,
        epics: [
          sampleEpic({
            id: 'epic:unmapped:fips',
            epicKey: 'FIPS',
            title: 'FIPS binaries',
            teams: {
              contributingOrgTeams: [],
              crossTeam: false,
              teamCount: 0,
            },
          }),
        ],
      },
      {
        id: 'dlvp',
        title: 'Lifecycle visibility',
        product: 'Sec AI Dev Accelerators',
        coveragePct: 85,
        epicCount: 1,
        epics: [sampleEpic()],
      },
    ];

    const filtered = filterRoadmaps(roadmaps, {
      search: '',
      product: '',
      owner: '',
      coverage: '',
      engineeringTeam: '',
      deckBucket: '',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('dlvp');
    expect(filtered[0]?.epics).toHaveLength(1);
  });
});
