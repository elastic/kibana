/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { briefFixture, evidenceFixture } from '../../__fixtures__/brief_fixture';
import { createBriefActions, renderBrief } from '../../__fixtures__/render_brief';
import { RecommendedActions } from './recommended_actions';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../../../common/hooks/use_is_new_flyout_enabled', () => ({
  useIsNewFlyoutEnabled: () => true,
}));
jest.mock('../../../../../flyout_v2/use_flyout_api', () => ({
  useFlyoutApi: () => ({ openEntityFlyout: jest.fn(), openRuleFlyout: jest.fn() }),
}));

const renderActions = (
  actions: ReturnType<typeof createBriefActions> | null = createBriefActions()
) => renderBrief(<RecommendedActions brief={briefFixture} evidence={evidenceFixture} />, actions);

describe('RecommendedActions', () => {
  it('groups the actions by urgency, in order, with a heading per non-empty group', () => {
    renderActions();

    ['now', 'this_week', 'next_review'].forEach((urgency) =>
      expect(screen.getByTestId(`executiveBriefActionGroup-${urgency}`)).toBeInTheDocument()
    );
    expect(screen.getByTestId('executiveBriefActionGroupTitle-now')).toHaveTextContent('Now');
    expect(screen.getByTestId('executiveBriefActionGroupTitle-this_week')).toHaveTextContent(
      'This week'
    );
    expect(screen.getByTestId('executiveBriefActionGroupTitle-next_review')).toHaveTextContent(
      'Next review'
    );
    expect(
      within(screen.getByTestId('executiveBriefActionGroup-now')).getAllByTestId(
        /^executiveBriefAction-\d$/
      )
    ).toHaveLength(2);
    expect(
      within(screen.getByTestId('executiveBriefActionGroup-this_week')).getAllByTestId(
        /^executiveBriefAction-\d$/
      )
    ).toHaveLength(2);
  });

  it('skips groups without actions', () => {
    renderBrief(
      <RecommendedActions
        brief={{ ...briefFixture, actions: [briefFixture.actions[0]] }}
        evidence={evidenceFixture}
      />
    );

    expect(screen.getByTestId('executiveBriefActionGroup-now')).toBeInTheDocument();
    expect(screen.queryByTestId('executiveBriefActionGroup-this_week')).not.toBeInTheDocument();
  });

  it('renders an empty prompt when there are no actions', () => {
    renderBrief(
      <RecommendedActions brief={{ ...briefFixture, actions: [] }} evidence={evidenceFixture} />
    );

    expect(screen.getByTestId('executiveBriefActionsEmpty')).toHaveTextContent(
      'No recommended actions'
    );
  });

  it('shows the owner and the threat on the meta line, or just the owner without a threat', () => {
    renderActions();

    expect(
      within(screen.getByTestId('executiveBriefAction-0')).getByTestId('executiveBriefActionMeta')
    ).toHaveTextContent('Owner: SOC · Threat 1');
    expect(
      within(screen.getByTestId('executiveBriefAction-2')).getByTestId('executiveBriefActionMeta')
    ).toHaveTextContent('Owner: IAM · Threat 2');
    const unrelated = within(screen.getByTestId('executiveBriefAction-4')).getByTestId(
      'executiveBriefActionMeta'
    );
    expect(unrelated).toHaveTextContent('Owner: Detection engineering');
    expect(unrelated).not.toHaveTextContent('Threat');
  });

  it('opens the threat from the meta line without expanding the row', () => {
    const actions = createBriefActions();
    renderActions(actions);

    fireEvent.click(screen.getByTestId('executiveBriefActionThreat-2'));

    expect(actions.openThreat).toHaveBeenCalledWith(2);
    expect(
      within(screen.getByTestId('executiveBriefAction-2')).getByTestId(
        'executiveBriefActionRationale'
      )
    ).not.toBeVisible();
  });

  it('is collapsed by default and expands to the rationale, threat and targets', () => {
    const actions = createBriefActions();
    renderActions(actions);
    const row = within(screen.getByTestId('executiveBriefAction-0'));

    expect(row.getByTestId('executiveBriefActionRationale')).not.toBeVisible();

    fireEvent.click(row.getByText(briefFixture.actions[0].action));

    expect(row.getByTestId('executiveBriefActionRationale')).toBeVisible();
    expect(row.getByTestId('executiveBriefActionRationale')).toHaveTextContent(
      'All 12 alerts are open and no case exists'
    );
    expect(row.getByText('Relates to')).toBeInTheDocument();
    expect(row.getByText('Targets')).toBeInTheDocument();

    fireEvent.click(row.getByTestId('executiveBriefActionThreatChip-0'));
    expect(actions.openThreat).toHaveBeenCalledWith(1);

    fireEvent.click(row.getByTestId('leadEntityBadge-docker-host-prod-01'));
    expect(actions.openEntity).toHaveBeenCalledWith(evidenceFixture.entities['ENT-3']);
  });

  it('triages an action with its rationale, targets and the related threat', () => {
    const actions = createBriefActions();
    renderActions(actions);

    fireEvent.click(screen.getByTestId('executiveBriefActionTriage-0'));

    expect(actions.triage).toHaveBeenCalledTimes(1);
    const [request] = (actions.triage as jest.Mock).mock.calls[0];
    expect(request.instruction).toContain(briefFixture.actions[0].action);
    expect(request.evidenceMarkdown).toContain('Urgency: Now; owner: SOC');
    expect(request.evidenceMarkdown).toContain('Relates to priority threat 1');
    expect(request.evidenceMarkdown).toContain('docker-host-prod-01');
  });

  it('renders no triage buttons and no links without a provider', () => {
    renderActions(null);

    expect(screen.queryByTestId(/executiveBriefActionTriage-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/executiveBriefActionThreat-/)).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('executiveBriefAction-0')).getByTestId('executiveBriefActionMeta')
    ).toHaveTextContent('Owner: SOC · Threat 1');
  });

  it('hides triage when the provider has none', () => {
    renderActions(createBriefActions({ triage: undefined }));

    expect(screen.queryByTestId(/executiveBriefActionTriage-/)).not.toBeInTheDocument();
    expect(screen.getByTestId('executiveBriefActionThreat-0')).toBeInTheDocument();
  });
});
