/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { FIXTURE_BRIEF, FIXTURE_EVIDENCE } from '../../__fixtures__/flyout_brief_document';
import type { BriefActions } from '../../actions/brief_actions_context';
import { BriefActionsProvider } from '../../actions/brief_actions_context';
import { AtAGlance } from './at_a_glance';
import { buildAreaTriageRequest, buildVerdictTriageRequest } from './triage_requests';

const period = { from: '2026-10-02T10:00:00.000Z', to: '2026-10-09T10:00:00.000Z' };

const createActions = (overrides: Partial<BriefActions> = {}): BriefActions => ({
  triage: jest.fn(),
  openEntity: jest.fn(),
  openThreat: jest.fn(),
  ...overrides,
});

const renderAtAGlance = (
  actions: BriefActions | undefined,
  brief = FIXTURE_BRIEF
): ReturnType<typeof render> =>
  render(
    <I18nProvider>
      <BriefActionsProvider value={actions}>
        <AtAGlance brief={brief} evidence={FIXTURE_EVIDENCE} period={period} />
      </BriefActionsProvider>
    </I18nProvider>
  );

describe('AtAGlance', () => {
  it('renders the verdict with its level, headline and summary', () => {
    renderAtAGlance(createActions());

    expect(screen.getByTestId('executiveBriefVerdict')).toHaveAttribute('data-level', 'urgent');
    expect(screen.getByTestId('executiveBriefVerdictLabel')).toHaveTextContent(
      'Urgent attention needed'
    );
    expect(screen.getByTestId('executiveBriefVerdictHeadline')).toHaveTextContent(
      FIXTURE_BRIEF.verdict.headline
    );
    expect(screen.getByTestId('executiveBriefVerdictSummary')).toHaveTextContent(
      FIXTURE_BRIEF.verdict.summary
    );
  });

  it("shows the top threat's next step", () => {
    renderAtAGlance(createActions());

    expect(screen.getByTestId('executiveBriefNextStep')).toHaveTextContent(
      'Next step: Isolate jump-box-01 and reset the credentials'
    );
  });

  it('hides the next step when nothing needs attention', () => {
    renderAtAGlance(createActions(), {
      ...FIXTURE_BRIEF,
      verdict: { ...FIXTURE_BRIEF.verdict, level: 'clear' },
    });

    expect(screen.queryByTestId('executiveBriefNextStep')).not.toBeInTheDocument();
  });

  it('triages the verdict with the instruction and evidence markdown', () => {
    const actions = createActions();
    renderAtAGlance(actions);

    fireEvent.click(screen.getByTestId('executiveBriefVerdictTriage'));

    expect(actions.triage).toHaveBeenCalledWith(
      buildVerdictTriageRequest(FIXTURE_BRIEF, FIXTURE_EVIDENCE, period)
    );
  });

  it('opens the top threat from the verdict', () => {
    const actions = createActions();
    renderAtAGlance(actions);

    fireEvent.click(screen.getByTestId('executiveBriefVerdictView'));

    expect(actions.openThreat).toHaveBeenCalledWith(1);
  });

  it('hides triage when the agent is not available', () => {
    renderAtAGlance(createActions({ triage: undefined }));

    expect(screen.queryByTestId('executiveBriefVerdictTriage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefAreaTriage-threats')).not.toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefVerdictView')).toBeInTheDocument();
  });

  it('renders no controls without an actions provider', () => {
    renderAtAGlance(undefined);

    expect(screen.getByTestId('executiveBriefVerdict')).toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefVerdictTriage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefVerdictView')).not.toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefAreaLink-threats')).not.toBeInTheDocument();
  });

  describe('area rows', () => {
    it('lists the areas under the Priority threats heading with their summaries', () => {
      renderAtAGlance(createActions());

      expect(screen.getByTestId('executiveBriefAreaRows')).toHaveTextContent('Priority threats');
      expect(screen.getByTestId('executiveBriefAreaRow-threats')).toHaveTextContent(
        'Threat activity'
      );
      expect(screen.getByTestId('executiveBriefAreaSummary-threats')).toHaveTextContent(
        '1 critical threat unaddressed'
      );
      expect(screen.getByTestId('executiveBriefAreaRow-response')).toHaveTextContent('Action');
    });

    it('opens the top threat from Threat activity, by link or icon', () => {
      const actions = createActions();
      renderAtAGlance(actions);

      fireEvent.click(screen.getByTestId('executiveBriefAreaLink-threats'));
      fireEvent.click(screen.getByTestId('executiveBriefAreaView-threats'));

      expect(actions.openThreat).toHaveBeenCalledTimes(2);
      expect(actions.openThreat).toHaveBeenNthCalledWith(1, 1);
      expect(actions.openThreat).toHaveBeenNthCalledWith(2, 1);
    });

    it('opens the first unaddressed threat from Response', () => {
      const actions = createActions();
      const [first, second] = FIXTURE_BRIEF.threats;
      renderAtAGlance(actions, {
        ...FIXTURE_BRIEF,
        threats: [
          { ...first, status: 'contained' },
          { ...second, status: 'unaddressed' },
        ],
      });

      fireEvent.click(screen.getByTestId('executiveBriefAreaView-response'));

      expect(actions.openThreat).toHaveBeenCalledWith(2);
    });

    it('triages an area with a request built from its cited evidence', () => {
      const actions = createActions();
      renderAtAGlance(actions);

      fireEvent.click(screen.getByTestId('executiveBriefAreaTriage-response'));

      expect(actions.triage).toHaveBeenCalledWith(
        buildAreaTriageRequest(FIXTURE_BRIEF.areas[1], FIXTURE_BRIEF, FIXTURE_EVIDENCE, period)
      );
    });

    it('does not offer actions on a clear area', () => {
      renderAtAGlance(createActions(), {
        ...FIXTURE_BRIEF,
        areas: [{ ...FIXTURE_BRIEF.areas[0], level: 'clear' }],
      });

      expect(screen.queryByTestId('executiveBriefAreaTriage-threats')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefAreaView-threats')).not.toBeInTheDocument();
    });
  });
});

describe('triage requests', () => {
  it('names entities and never includes Entity Store ids', () => {
    const { instruction, evidenceMarkdown } = buildVerdictTriageRequest(
      FIXTURE_BRIEF,
      FIXTURE_EVIDENCE,
      period
    );

    expect(instruction).toContain(FIXTURE_BRIEF.verdict.headline);
    expect(evidenceMarkdown).toContain('a.rodriguez (user, privileged, risk Critical)');
    expect(evidenceMarkdown).toContain(
      'Credential access to lateral movement (F-1; critical; 2026-10-08T10:00:00.000Z): alerts 12, tactics: Credential Access, Lateral Movement. Entities: a.rodriguez, jump-box-01'
    );
    expect(evidenceMarkdown).toContain('a.rodriguez logged on to (rarely) jump-box-01 (L-1)');
    expect(evidenceMarkdown).toContain(
      'Isolate jump-box-01 and reset the credentials (owner SOC; now)'
    );
    expect(evidenceMarkdown).toContain(`Time range: ${period.from} to ${period.to}`);
    expect(evidenceMarkdown).not.toContain('user:a.rodriguez@acme.example');
  });

  it('builds a different request for each area', () => {
    const [threats, response] = FIXTURE_BRIEF.areas;
    const threatsRequest = buildAreaTriageRequest(threats, FIXTURE_BRIEF, FIXTURE_EVIDENCE);
    const responseRequest = buildAreaTriageRequest(response, FIXTURE_BRIEF, FIXTURE_EVIDENCE);

    expect(threatsRequest.instruction).toContain('threat activity');
    expect(responseRequest.instruction).toContain('response');
    expect(responseRequest.evidenceMarkdown).toContain('Open alerts without a case (F-2; high)');
    expect(responseRequest.evidenceMarkdown).not.toContain('Time range');
  });
});
