/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { briefFixture, evidenceFixture } from '../../__fixtures__/brief_fixture';
import { createBriefActions, renderBrief } from '../../__fixtures__/render_brief';
import { PriorityThreats } from './priority_threats';

let mockOpenRequest: { rank: number; nonce: number } | undefined;

jest.mock(
  '../../flyout/threat_open_request',
  () => ({ useThreatOpenRequest: () => mockOpenRequest }),
  { virtual: true }
);
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));
jest.mock('../../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openEntityFlyout: jest.fn(), openRuleFlyout: jest.fn() }),
}));
jest.mock('../../../../../common/components/links', () => ({
  CaseDetailsLink: ({ children }: { children: React.ReactNode }) => <a href="#case">{children}</a>,
}));

const renderThreats = (actions = createBriefActions()) =>
  renderBrief(<PriorityThreats brief={briefFixture} evidence={evidenceFixture} />, actions);

describe('PriorityThreats', () => {
  beforeEach(() => {
    mockOpenRequest = undefined;
  });

  it('renders a card per threat, ranked in order', () => {
    renderThreats();

    [1, 2, 3].forEach((rank) =>
      expect(screen.getByTestId(`executiveBriefThreatCard-${rank}`)).toBeInTheDocument()
    );
    expect(screen.getByTestId('executiveBriefThreatTitle-1')).toHaveTextContent(
      "Privileged user's credentials linked to reaching a production host"
    );
    expect(screen.getByTestId('executiveBriefThreatTitle-3')).toHaveTextContent(
      'SSH password spray followed by data upload from a build server'
    );
  });

  it('renders an empty prompt when there are no threats', () => {
    renderBrief(
      <PriorityThreats brief={{ ...briefFixture, threats: [] }} evidence={evidenceFixture} />
    );

    expect(screen.getByTestId('executiveBriefThreatsEmpty')).toHaveTextContent(
      'No priority threats'
    );
    expect(screen.queryByTestId('executiveBriefThreatCard-1')).not.toBeInTheDocument();
  });

  describe('collapsed card', () => {
    it('shows the header, meta line, entities, next step and a narrative preview', () => {
      renderThreats();
      const card = within(screen.getByTestId('executiveBriefThreatCard-2'));

      expect(card.getByTestId('executiveBriefSeverity-2')).toHaveTextContent('High');
      expect(card.getByTestId('executiveBriefThreatMeta-2')).toHaveTextContent(
        'Being handled · High confidence · Initial Access → Credential Access'
      );
      expect(card.getByText('j.chen')).toBeInTheDocument();
      expect(card.getByText('LAPTOP-MKT07')).toBeInTheDocument();
      expect(card.getByTestId('executiveBriefThreatNextStep-2')).toHaveTextContent(
        'Next step: Review and advance the in-progress marketing account takeover case'
      );
      expect(card.getByTestId('executiveBriefNarrativePreview-2')).toHaveTextContent(
        'j.chen was hit by MFA bombing'
      );
      expect(card.queryByTestId('executiveBriefThreatBody-2')).not.toBeInTheDocument();
      expect(card.getByTestId('executiveBriefThreatTitle-2')).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });

    it('is open by default for rank 1 only', () => {
      renderThreats();

      expect(screen.getByTestId('executiveBriefThreatBody-1')).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefNarrativePreview-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefThreatBody-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefThreatBody-3')).not.toBeInTheDocument();
    });
  });

  describe('expanded card', () => {
    it('toggles from the title and the chevron', () => {
      renderThreats();

      fireEvent.click(screen.getByTestId('executiveBriefThreatTitle-2'));
      expect(screen.getByTestId('executiveBriefThreatBody-2')).toBeInTheDocument();
      expect(screen.getByTestId('executiveBriefThreatTitle-2')).toHaveAttribute(
        'aria-expanded',
        'true'
      );

      fireEvent.click(screen.getByTestId('executiveBriefThreatToggle-2'));
      expect(screen.queryByTestId('executiveBriefThreatBody-2')).not.toBeInTheDocument();
    });

    it('shows the narrative, why it matters, how it was found, timeline, response and actions', () => {
      renderThreats();
      const body = within(screen.getByTestId('executiveBriefThreatBody-1'));

      expect(body.getByText(/are part of the same discovered attack/)).toBeInTheDocument();
      expect(body.getByText(/is a privileged user and docker-host-prod-01/)).toBeInTheDocument();
      expect(body.getByTestId('executiveBriefHowFound-attack_discovery')).toBeInTheDocument();
      expect(body.getByTestId('executiveBriefSteps')).toBeInTheDocument();
      expect(body.getByTestId('executiveBriefStepsShowAll')).toHaveTextContent(
        'Show 3 more events'
      );
      expect(body.getByTestId('executiveBriefResponseState')).toHaveTextContent('Unaddressed');
      expect(body.getByTestId('executiveBriefResponseAlerts')).toHaveTextContent(
        '12 open · 0 acknowledged · 0 closed'
      );
    });

    it('lists only the actions for the threat, inline without a threat reference', () => {
      renderThreats();
      const body = within(screen.getByTestId('executiveBriefThreatBody-1'));

      expect(body.getByTestId('executiveBriefAction-0-inline')).toHaveTextContent(
        'Open a formal case and assign an incident owner'
      );
      expect(body.getByTestId('executiveBriefAction-1-inline')).toBeInTheDocument();
      expect(body.queryByTestId('executiveBriefAction-2-inline')).not.toBeInTheDocument();
      expect(body.getByTestId('executiveBriefAction-0-inline')).toHaveTextContent(
        'Now · Owner: SOC'
      );
      expect(body.queryByText('Threat 1')).not.toBeInTheDocument();
    });

    it("shows a case link and no alert counts it can't back for a handled threat", () => {
      renderThreats();
      fireEvent.click(screen.getByTestId('executiveBriefThreatTitle-2'));
      const response = within(
        within(screen.getByTestId('executiveBriefThreatBody-2')).getByTestId(
          'executiveBriefResponse'
        )
      );

      expect(response.getByTestId('executiveBriefResponseState')).toHaveTextContent(
        'Being handled'
      );
      expect(response.getByTestId('executiveBriefCaseChip')).toHaveTextContent(
        'Marketing account takeover'
      );
      expect(response.getByTestId('executiveBriefResponseAlerts')).toHaveTextContent(
        '0 open · 4 acknowledged · 0 closed'
      );
    });
  });

  describe('actions', () => {
    it('opens the entity from an entity chip', () => {
      const actions = createBriefActions();
      renderThreats(actions);

      fireEvent.click(
        within(screen.getByTestId('executiveBriefThreatEntities-1')).getByTestId(
          'leadEntityBadge-jump-box-01'
        )
      );

      expect(actions.openEntity).toHaveBeenCalledWith(evidenceFixture.entities['ENT-2']);
    });

    it('triages the threat with the evidence', () => {
      const actions = createBriefActions();
      renderThreats(actions);

      fireEvent.click(screen.getByTestId('executiveBriefThreatTriage-1'));

      expect(actions.triage).toHaveBeenCalledTimes(1);
      const [request] = (actions.triage as jest.Mock).mock.calls[0];
      expect(request.instruction).toContain('priority threat 1');
      expect(request.evidenceMarkdown).toContain('## Priority threat 1:');
      expect(request.evidenceMarkdown).toContain('a.rodriguez');
      expect(request.evidenceMarkdown).toContain(
        'First-ever logon from a.rodriguez to jump-box-01'
      );
    });

    it('does not toggle the card when triaging', () => {
      renderThreats();

      fireEvent.click(screen.getByTestId('executiveBriefThreatTriage-2'));

      expect(screen.queryByTestId('executiveBriefThreatBody-2')).not.toBeInTheDocument();
    });

    it('expands the matching card when an open request arrives', () => {
      const view = renderThreats();
      expect(screen.queryByTestId('executiveBriefThreatBody-3')).not.toBeInTheDocument();

      mockOpenRequest = { rank: 3, nonce: 1 };
      act(() => {
        view.rerender(<PriorityThreats brief={briefFixture} evidence={evidenceFixture} />);
      });

      expect(screen.getByTestId('executiveBriefThreatBody-3')).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefThreatBody-2')).not.toBeInTheDocument();
    });
  });

  describe('without actions (no provider)', () => {
    it('renders no triage button and no clickable entity chips or timeline toggles', () => {
      renderBrief(<PriorityThreats brief={briefFixture} evidence={evidenceFixture} />, null);

      expect(screen.queryByTestId(/executiveBriefThreatTriage-/)).not.toBeInTheDocument();
      expect(screen.queryByTestId(/executiveBriefActionTriage-/)).not.toBeInTheDocument();
      expect(screen.queryByTestId('leadEntityBadge-a.rodriguez')).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('executiveBriefThreatEntities-1')).getByTestId(
          'executiveBriefEntityChip-a.rodriguez'
        )
      ).toBeInTheDocument();
      expect(screen.queryByTestId('executiveBriefStepsShowAll')).not.toBeInTheDocument();
      expect(screen.getAllByTestId(/^executiveBriefEvent-F-/)).toHaveLength(7);
    });
  });

  describe('without triage', () => {
    it('hides every triage button when the provider has no triage', () => {
      renderThreats(createBriefActions({ triage: undefined }));

      expect(screen.queryByTestId(/Triage-/)).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('executiveBriefThreatEntities-1')).getByTestId(
          'leadEntityBadge-a.rodriguez'
        )
      ).toBeInTheDocument();
    });
  });
});
