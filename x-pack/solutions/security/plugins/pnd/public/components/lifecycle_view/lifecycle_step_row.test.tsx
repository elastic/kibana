/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { PHASE_CATALOG, PND_GATE_PHASE_STEP_IDS } from '@kbn/pnd-common';
import type { PhaseCatalogEntry, PndPhaseStepProjection } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { LifecycleStepRow } from './lifecycle_step_row';
import type { LifecycleRow } from './helpers/build_lifecycle_rows';
import * as i18n from './translations';

const entryFor = (id: string): PhaseCatalogEntry => {
  const entry = PHASE_CATALOG.find((candidate) => candidate.id === id);

  if (entry == null) {
    throw new Error(`no catalog entry for ${id}`);
  }

  return entry;
};

const projection = (
  phaseStepId: string,
  overrides: Partial<PndPhaseStepProjection> = {}
): PndPhaseStepProjection => ({
  deepLinkPath: `/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=${phaseStepId}-step`,
  finishedAt: '2026-08-03T10:00:01.000Z',
  phaseStepId,
  startedAt: '2026-08-03T10:00:00.000Z',
  status: 'completed',
  stepExecutionId: `${phaseStepId}-step`,
  workflowId: 'system-security-watch-deep',
  workflowRunId: 'run-1',
  ...overrides,
});

const row = (overrides: Partial<LifecycleRow> = {}): LifecycleRow => ({
  entry: entryFor('step-2-6'),
  projection: projection('step-2-6'),
  status: 'completed',
  subordinates: [],
  ...overrides,
});

const pairedRow = (): LifecycleRow => ({
  entry: entryFor('step-2-7'),
  projection: projection('step-2-7'),
  status: 'waiting_for_input',
  subordinates: [
    {
      entry: entryFor(PND_GATE_PHASE_STEP_IDS.promoteIncident),
      projection: projection('step-2-7'),
      status: 'waiting_for_input',
    },
  ],
});

const mockGetUrlForApp = jest.fn();

const services = {
  application: { getUrlForApp: mockGetUrlForApp, navigateToApp: jest.fn() },
};

describe('LifecycleStepRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockImplementation(
      (appId: string, { path }: { path: string }) => `/s/agent-4/app/${appId}${path}`
    );
  });

  it('renders the label of the step', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByText(entryFor('step-2-6').label)).toBeInTheDocument();
  });

  it('renders the description of the step', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByText(entryFor('step-2-6').description)).toBeInTheDocument();
  });

  it('renders the status badge for the resolved status', () => {
    renderWithPndProviders(<LifecycleStepRow row={row({ status: 'upstream' })} />, { services });

    expect(screen.getByTestId('pndPhaseStepStatusBadge')).toHaveAttribute(
      'data-status',
      'upstream'
    );
  });

  it('tags the row with its phase step id, so a test can address one row', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByTestId('pndLifecycleStepRow')).toHaveAttribute(
      'data-phase-step-id',
      'step-2-6'
    );
  });

  it('links to the step execution through the workflows app, space prefix included', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByTestId('pndLifecycleStepLink')).toHaveAttribute(
      'href',
      `/s/agent-4/app/workflows${projection('step-2-6').deepLinkPath}`
    );
  });

  it('carries the step execution id of the row in the link, not just the run id', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByTestId('pndLifecycleStepLink').getAttribute('href')).toContain(
      'stepExecutionId=step-2-6-step'
    );
  });

  it('opens the step link in a new tab, so the lifecycle stays open behind it', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByTestId('pndLifecycleStepLink')).toHaveAttribute('target', '_blank');
  });

  it('renders an explicit no-execution note rather than a dead link when there is no deep link', () => {
    renderWithPndProviders(
      <LifecycleStepRow row={row({ projection: undefined, status: 'not_started' })} />,
      { services }
    );

    expect(screen.getByTestId('pndLifecycleStepLinkUnavailable')).toHaveTextContent(
      i18n.NO_STEP_EXECUTION
    );
  });

  it('renders no link at all when there is no execution to link to', () => {
    renderWithPndProviders(
      <LifecycleStepRow row={row({ projection: undefined, status: 'not_started' })} />,
      { services }
    );

    expect(screen.queryByTestId('pndLifecycleStepLink')).not.toBeInTheDocument();
  });

  it('says the workflows app is unavailable rather than rendering a link that goes nowhere', () => {
    mockGetUrlForApp.mockImplementation(() => {
      throw new Error('Application workflows is not registered');
    });

    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByTestId('pndLifecycleStepLinkUnavailable')).toHaveTextContent(
      i18n.WORKFLOWS_APP_UNAVAILABLE
    );
  });

  it('renders the duplicated gate as a subordinate line', () => {
    renderWithPndProviders(<LifecycleStepRow row={pairedRow()} />, { services });

    expect(screen.getByTestId('pndLifecycleSubordinateLine')).toHaveAttribute(
      'data-phase-step-id',
      PND_GATE_PHASE_STEP_IDS.promoteIncident
    );
  });

  it('gives the subordinate line its own link to the step execution', () => {
    renderWithPndProviders(<LifecycleStepRow row={pairedRow()} />, { services });

    expect(screen.getAllByTestId('pndLifecycleStepLink')).toHaveLength(2);
  });

  it('renders one status badge for the pair, so the two lines can never disagree', () => {
    renderWithPndProviders(<LifecycleStepRow row={pairedRow()} />, { services });

    expect(screen.getAllByTestId('pndPhaseStepStatusBadge')).toHaveLength(1);
  });

  it('renders no subordinate line for an ordinary row', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.queryByTestId('pndLifecycleSubordinateLine')).not.toBeInTheDocument();
  });

  it('renders the start timestamp as a machine-readable time', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByTestId('pndLifecycleStepStartedAt')).toHaveAttribute(
      'datetime',
      '2026-08-03T10:00:00.000Z'
    );
  });

  it('renders the finish timestamp as a machine-readable time', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.getByTestId('pndLifecycleStepFinishedAt')).toHaveAttribute(
      'datetime',
      '2026-08-03T10:00:01.000Z'
    );
  });

  it('renders no timestamps for a row that never executed', () => {
    renderWithPndProviders(
      <LifecycleStepRow row={row({ projection: undefined, status: 'not_started' })} />,
      { services }
    );

    expect(screen.queryByTestId('pndLifecycleStepStartedAt')).not.toBeInTheDocument();
  });

  it('renders the evidence it is given', () => {
    renderWithPndProviders(
      <LifecycleStepRow evidence={<div data-test-subj="pndTestEvidence" />} row={row()} />,
      { services }
    );

    expect(screen.getByTestId('pndTestEvidence')).toBeInTheDocument();
  });

  it('offers to open the conversation when one exists', () => {
    renderWithPndProviders(<LifecycleStepRow onOpenConversation={jest.fn()} row={row()} />, {
      services,
    });

    expect(screen.getByTestId('pndLifecycleOpenConversation')).toBeInTheDocument();
  });

  it('does not offer to open a conversation that does not exist', () => {
    renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

    expect(screen.queryByTestId('pndLifecycleOpenConversation')).not.toBeInTheDocument();
  });

  it('opens the conversation when the action is clicked', () => {
    const onOpenConversation = jest.fn();

    renderWithPndProviders(
      <LifecycleStepRow onOpenConversation={onOpenConversation} row={row()} />,
      { services }
    );
    fireEvent.click(screen.getByTestId('pndLifecycleOpenConversation'));

    expect(onOpenConversation).toHaveBeenCalledTimes(1);
  });
  describe('accessible names', () => {
    it('names the step link after its row, so 11 "View step" links are distinguishable', () => {
      renderWithPndProviders(<LifecycleStepRow row={row()} />, { services });

      expect(screen.getByTestId('pndLifecycleStepLink')).toHaveAccessibleName(
        i18n.viewStepAriaLabel(entryFor('step-2-6').label)
      );
    });

    it("gives a subordinate line its own accessible name, not the primary row's", () => {
      renderWithPndProviders(<LifecycleStepRow row={pairedRow()} />, { services });

      const subordinate = entryFor(PND_GATE_PHASE_STEP_IDS.promoteIncident);

      expect(
        screen.getAllByTestId('pndLifecycleStepLink').map((link) => link.getAttribute('aria-label'))
      ).toContain(i18n.viewStepAriaLabel(subordinate.label));
    });

    it('names the conversation action after its row', () => {
      renderWithPndProviders(<LifecycleStepRow onOpenConversation={jest.fn()} row={row()} />, {
        services,
      });

      expect(screen.getByTestId('pndLifecycleOpenConversation')).toHaveAccessibleName(
        i18n.openConversationAriaLabel(entryFor('step-2-6').label)
      );
    });
  });
});
