/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { PHASE_CATALOG } from '@kbn/pnd-common';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../../../common/constants';
import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../../../test_helpers/create_http_response';
import { renderWithPndProviders } from '../../../test_utils/render_with_pnd_providers';
import { LifecycleTimelineTab } from '.';

const renderTab = ({
  correlated = 'true',
  steps = [],
}: {
  correlated?: string;
  steps?: PndPhaseStepProjection[];
} = {}) => {
  const get = jest.fn(async () =>
    createHttpResponse({
      body: { correlationId: 'ad-1', steps },
      headers: { [PND_EXECUTION_CORRELATED_HEADER]: correlated },
    })
  );

  return renderWithPndProviders(<LifecycleTimelineTab correlationId="ad-1" />, {
    services: { http: { get } },
  });
};

const first: PndPhaseStepProjection = {
  finishedAt: '2026-08-05T00:00:02.000Z',
  phaseStepId: 'step-1-1',
  startedAt: '2026-08-05T00:00:01.000Z',
  status: 'completed',
  workflowRunId: 'run-1',
};

/**
 * The label the catalog gives the first entry's row.
 *
 * Derived rather than spelled out: catalog labels are the product copy and they move, and the
 * destructure throws loudly if `first` ever names a row the catalog does not have.
 */
const [{ label: FIRST_LABEL }] = PHASE_CATALOG.filter(({ id }) => id === first.phaseStepId);

const second: PndPhaseStepProjection = {
  phaseStepId: 'step-2-1',
  startedAt: '2026-08-05T00:00:03.000Z',
  status: 'running',
  workflowRunId: 'run-1',
};

describe('LifecycleTimelineTab', () => {
  it('renders a spinner while the projection is in flight', () => {
    renderTab();

    expect(screen.getByTestId('pndLoadingState')).toBeInTheDocument();
  });

  it('renders the timeline panel once the projection arrives', async () => {
    renderTab({ steps: [first] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecyclePanel-timeline')).toBeInTheDocument()
    );
  });

  it('renders one entry per step that ran', async () => {
    renderTab({ steps: [first, second] });

    await waitFor(() => expect(screen.getAllByTestId('pndLifecycleTimelineEntry')).toHaveLength(2));
  });

  it('orders the entries by when they started', async () => {
    renderTab({ steps: [second, first] });

    await waitFor(() =>
      expect(
        screen
          .getAllByTestId('pndLifecycleTimelineEntry')
          .map((entry) => entry.getAttribute('data-phase-step-id'))
      ).toEqual(['step-1-1', 'step-2-1'])
    );
  });

  it('renders the start time as a machine-readable instant', async () => {
    renderTab({ steps: [first] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleTimelineStartedAt')).toHaveAttribute(
        'datetime',
        '2026-08-05T00:00:01.000Z'
      )
    );
  });

  it('renders the finish time when the step has one', async () => {
    renderTab({ steps: [first] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleTimelineFinishedAt')).toHaveTextContent(
        '2026-08-05T00:00:02.000Z'
      )
    );
  });

  it('omits the finish time while the step is still running', async () => {
    renderTab({ steps: [second] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleTimelineEntry')).toBeInTheDocument()
    );

    expect(screen.queryByTestId('pndLifecycleTimelineFinishedAt')).not.toBeInTheDocument();
  });

  it('names the step each entry belongs to', async () => {
    renderTab({ steps: [first] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleTimelineEntry')).toHaveTextContent(FIRST_LABEL)
    );
  });

  it('renders the step status', async () => {
    renderTab({ steps: [first] });

    await waitFor(() =>
      expect(screen.getByTestId('pndPhaseStepStatusBadge')).toHaveAttribute(
        'data-status',
        'completed'
      )
    );
  });

  it('reads as normal, not as a failure, when a correlated run has not timestamped anything yet', async () => {
    renderTab({
      steps: [{ phaseStepId: 'step-1-1', status: 'not_started', workflowRunId: 'run-1' }],
    });

    await waitFor(() => expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument());
  });

  it('renders the could-not-correlate state rather than an empty timeline', async () => {
    renderTab({ correlated: 'false', steps: [first] });

    await waitFor(() =>
      expect(screen.getByTestId('pndCorrelationUnavailableState')).toBeInTheDocument()
    );
  });

  it('renders an error state when the projection cannot be read', async () => {
    const get = jest.fn(async () => {
      throw createHttpFetchError({ status: 403 });
    });

    renderWithPndProviders(<LifecycleTimelineTab correlationId="ad-1" />, {
      services: { http: { get } },
    });

    await waitFor(() => expect(screen.getByTestId('pndErrorState')).toBeInTheDocument());
  });
});
