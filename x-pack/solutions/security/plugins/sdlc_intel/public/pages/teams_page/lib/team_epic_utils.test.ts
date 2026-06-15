/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SdlcEpicPhaseSummary, SdlcTeamCard } from '../../../../common/api/types';
import {
  computeAverageTeamsPerEpic,
  readTicketRollup,
  resolveTeamName,
} from './team_epic_utils';

const createEpic = (overrides: Partial<SdlcEpicPhaseSummary> = {}): SdlcEpicPhaseSummary => ({
  id: 'epic:dlvp:phase-a',
  epicKey: 'Phase A',
  displayId: '#4401',
  title: 'Phase A — engineering core',
  status: 'in-progress',
  coveragePct: 85,
  deliveryCoveragePct: 50,
  gatesPassedPct: 50,
  roadmap: { id: 'dlvp', title: 'Lifecycle visibility', product: 'Sec AI Dev Accelerators' },
  teams: {
    ownOrgTeam: 'siem',
    contributingOrgTeams: ['siem', 'si'],
    crossTeam: true,
    teamCount: 2,
  },
  links: {},
  ticketsByRepo: [],
  phases: {
    p4_tickets: {
      gate: 'warn',
      done: 3,
      total: 5,
      ai_gen: 2,
      eng_validated: 1,
    },
  },
  ...overrides,
});

describe('team_epic_utils', () => {
  describe('readTicketRollup', () => {
    it('returns zeros when p4 tickets are missing', () => {
      expect(readTicketRollup(createEpic({ phases: {} }))).toEqual({
        done: 0,
        total: 0,
        aiGen: 0,
        engValidated: 0,
      });
    });

    it('reads ticket counts from p4_tickets', () => {
      expect(readTicketRollup(createEpic())).toEqual({
        done: 3,
        total: 5,
        aiGen: 2,
        engValidated: 1,
      });
    });
  });

  describe('computeAverageTeamsPerEpic', () => {
    it('dedupes epics across teams and averages team counts', () => {
      const epicsByTeam = {
        siem: [createEpic({ id: 'a', teams: { ownOrgTeam: 'siem', contributingOrgTeams: ['siem'], crossTeam: false, teamCount: 1 } })],
        si: [
          createEpic({
            id: 'a',
            teams: {
              ownOrgTeam: 'siem',
              contributingOrgTeams: ['siem', 'si'],
              crossTeam: true,
              teamCount: 2,
            },
          }),
          createEpic({
            id: 'b',
            teams: { ownOrgTeam: 'si', contributingOrgTeams: ['si'], crossTeam: false, teamCount: 1 },
          }),
        ],
      };

      expect(computeAverageTeamsPerEpic(epicsByTeam)).toBe(1.5);
    });

    it('returns zero when there are no epics', () => {
      expect(computeAverageTeamsPerEpic({})).toBe(0);
    });
  });

  describe('resolveTeamName', () => {
    const teams: SdlcTeamCard[] = [
      {
        key: 'siem',
        name: 'SIEM',
        membersCount: 10,
        subteams: [],
        epicCount: 1,
        gatesPct: 80,
        ticketsDone: 1,
        ticketsTotal: 2,
        toProdPct: 50,
        aiPct: 20,
      },
    ];

    it('returns the configured team name when present', () => {
      expect(resolveTeamName('siem', teams)).toBe('SIEM');
    });

    it('falls back to the team key when unknown', () => {
      expect(resolveTeamName('unknown', teams)).toBe('unknown');
    });
  });
});
