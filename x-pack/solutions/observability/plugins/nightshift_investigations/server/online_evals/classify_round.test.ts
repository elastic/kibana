/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyInvestigationRun, type ClassifiableRound } from './classify_round';

const RUN_STARTED_AT = '2026-10-27T12:00:00.000Z';
const BEFORE_RUN = '2026-10-27T11:00:00.000Z';
const DURING_RUN = '2026-10-27T12:00:05.000Z';

const round = (id: string, startedAt: string): ClassifiableRound => ({
  id,
  started_at: startedAt,
});

describe('classifyInvestigationRun', () => {
  it('reports nothing when the investigation has no round', () => {
    expect(classifyInvestigationRun({ rounds: [], runStartedAt: RUN_STARTED_AT })).toBeUndefined();
  });

  describe('initial runs', () => {
    it('classifies a first round that started after the run as initial', () => {
      expect(
        classifyInvestigationRun({
          rounds: [round('round-1', DURING_RUN)],
          runStartedAt: RUN_STARTED_AT,
        })
      ).toEqual({ roundKind: 'initial', roundId: 'round-1' });
    });

    it('needs no context, as for a Slack run that passes none', () => {
      expect(
        classifyInvestigationRun({
          rounds: [round('round-1', DURING_RUN)],
          followUp: undefined,
          runStartedAt: RUN_STARTED_AT,
        })
      ).toEqual(expect.objectContaining({ roundKind: 'initial' }));
    });
  });

  describe('alert recoveries', () => {
    it('classifies the latest round of a recovery run, without a verdict yet', () => {
      expect(
        classifyInvestigationRun({
          rounds: [round('round-1', BEFORE_RUN), round('round-2', DURING_RUN)],
          followUp: 'alert_recovered',
          runStartedAt: RUN_STARTED_AT,
        })
      ).toEqual({ roundKind: 'alert_recovery', roundId: 'round-2' });
    });
  });

  describe('follow-ups', () => {
    it("classifies any other run as a follow-up on the investigation's latest round", () => {
      expect(
        classifyInvestigationRun({
          rounds: [
            round('round-1', BEFORE_RUN),
            round('round-2', BEFORE_RUN),
            round('round-3', DURING_RUN),
          ],
          runStartedAt: RUN_STARTED_AT,
        })
      ).toEqual({ roundKind: 'follow_up', roundId: 'round-3' });
    });
  });
});
