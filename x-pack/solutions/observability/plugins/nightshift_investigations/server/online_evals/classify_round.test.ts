/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SET_HYPOTHESES_TOOL_ID } from '@kbn/agentic-investigations-plugin/common';
import { classifyInvestigationRun, type ClassifiableRound } from './classify_round';

const RUN_STARTED_AT = '2026-10-27T12:00:00.000Z';

const setHypotheses = (hypotheses: Array<{ candidate: string; status: string }>) => ({
  type: 'tool_call',
  tool_id: SET_HYPOTHESES_TOOL_ID,
  params: { hypotheses: hypotheses.map((hypothesis) => ({ confidence: 0.8, ...hypothesis })) },
});

const round = (
  id: string,
  startedAt: string,
  steps: ClassifiableRound['steps'] = []
): ClassifiableRound => ({ id, started_at: startedAt, steps });

const BEFORE_RUN = '2026-10-27T11:00:00.000Z';
const DURING_RUN = '2026-10-27T12:00:05.000Z';

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
      ).toEqual({ roundKind: 'initial', roundId: 'round-1', rootCauseChanged: false });
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
      ).toEqual({ roundKind: 'alert_recovery', roundId: 'round-2', rootCauseChanged: false });
    });
  });

  describe('follow-ups', () => {
    const initial = round('round-1', BEFORE_RUN, [
      setHypotheses([
        { candidate: 'Bad deploy of payments', status: 'confirmed' },
        { candidate: 'Database saturation', status: 'dismissed' },
      ]),
    ]);

    const classifyFollowUp = (followUpSteps: ClassifiableRound['steps'], previous = [initial]) =>
      classifyInvestigationRun({
        rounds: [...previous, round('round-latest', DURING_RUN, followUpSteps)],
        runStartedAt: RUN_STARTED_AT,
      });

    it('classifies a question or Slack chatter as a follow-up that changed nothing', () => {
      expect(
        classifyFollowUp([{ type: 'reasoning', reasoning: 'Here are the error logs.' }])
      ).toEqual({ roundKind: 'follow_up', roundId: 'round-latest', rootCauseChanged: false });
    });

    it('flags a follow-up that confirms a different root cause', () => {
      expect(
        classifyFollowUp([
          setHypotheses([
            { candidate: 'Bad deploy of payments', status: 'dismissed' },
            { candidate: 'Expired TLS certificate', status: 'confirmed' },
          ]),
        ])
      ).toEqual(expect.objectContaining({ rootCauseChanged: true }));
    });

    it('flags a follow-up that confirms a root cause where none was confirmed', () => {
      const unconfirmed = round('round-1', BEFORE_RUN, [
        setHypotheses([{ candidate: 'Bad deploy of payments', status: 'investigating' }]),
      ]);

      expect(
        classifyFollowUp(
          [setHypotheses([{ candidate: 'Bad deploy of payments', status: 'confirmed' }])],
          [unconfirmed]
        )
      ).toEqual(expect.objectContaining({ rootCauseChanged: true }));
    });

    it('treats the same confirmed cause, differently cased or spaced, as unchanged', () => {
      expect(
        classifyFollowUp([
          setHypotheses([{ candidate: '  bad deploy   of PAYMENTS ', status: 'confirmed' }]),
        ])
      ).toEqual(expect.objectContaining({ rootCauseChanged: false }));
    });

    it('treats dismissing every hypothesis as no new root cause', () => {
      expect(
        classifyFollowUp([
          setHypotheses([{ candidate: 'Bad deploy of payments', status: 'dismissed' }]),
        ])
      ).toEqual(expect.objectContaining({ rootCauseChanged: false }));
    });

    it("reads only the round's last hypotheses call, since each call replaces the list", () => {
      expect(
        classifyFollowUp([
          setHypotheses([{ candidate: 'Expired TLS certificate', status: 'confirmed' }]),
          setHypotheses([{ candidate: 'Bad deploy of payments', status: 'confirmed' }]),
        ])
      ).toEqual(expect.objectContaining({ rootCauseChanged: false }));
    });

    it('compares against the last round that recorded hypotheses, skipping rounds that did not', () => {
      const chatter = round('round-2', BEFORE_RUN, [{ type: 'reasoning', reasoning: 'Logs' }]);

      expect(
        classifyFollowUp(
          [setHypotheses([{ candidate: 'Bad deploy of payments', status: 'confirmed' }])],
          [initial, chatter]
        )
      ).toEqual(expect.objectContaining({ rootCauseChanged: false }));
    });
  });
});
