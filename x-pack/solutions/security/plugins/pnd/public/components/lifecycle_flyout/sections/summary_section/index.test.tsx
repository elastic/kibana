/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import {
  PHASE_CATALOG,
  PND_GATE_PHASE_STEP_IDS,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
} from '@kbn/pnd-common';
import type { PndPhaseStepProjection } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../../../common/constants';
import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../../../test_helpers/create_http_response';
import { renderWithPndProviders } from '../../../test_utils/render_with_pnd_providers';
import { DUPLICATED_GATE_PAIRS } from '../../../lifecycle_view';
import { LifecycleSummarySection } from '.';

/** The denominator the progress line uses: live catalog rows that own a row of their own. */
const TOTAL_LIVE_STEPS = PHASE_CATALOG.filter(
  ({ id, liveness }) =>
    liveness === 'live' && !DUPLICATED_GATE_PAIRS.some(({ subordinateId }) => subordinateId === id)
).length;

const renderSection = ({
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

  return renderWithPndProviders(<LifecycleSummarySection correlationId="ad-1" />, {
    services: { http: { get } },
  });
};

const completedStep: PndPhaseStepProjection = {
  phaseStepId: 'step-1-1',
  status: 'completed',
  workflowRunId: 'run-1',
};

const parkedGate: PndPhaseStepProjection = {
  phaseStepId: PND_GATE_PHASE_STEP_IDS.openInvestigation,
  status: 'waiting_for_input',
  workflowRunId: 'run-1',
};

/**
 * The label the catalog gives the parked gate's row.
 *
 * Derived rather than spelled out: catalog labels are the product copy and they move, and the
 * destructure throws loudly if the gate ever stops being a catalog row of its own.
 */
const [{ label: PARKED_GATE_LABEL }] = PHASE_CATALOG.filter(
  ({ id }) => id === parkedGate.phaseStepId
);

describe('LifecycleSummarySection', () => {
  it('renders a spinner while the projection is in flight', () => {
    renderSection();

    expect(screen.getByTestId('pndLoadingState')).toBeInTheDocument();
  });

  it('renders the overview panel once the projection arrives', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleSection-summary')).toBeInTheDocument()
    );
  });

  it('names the discovery it is summarizing', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleOverviewAlertId')).toHaveTextContent('ad-1')
    );
  });

  it('reports progress as a fraction of the live steps only', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleOverviewProgress')).toHaveTextContent(
        `1 of ${TOTAL_LIVE_STEPS}`
      )
    );
  });

  it('names the gate the loop is parked on', async () => {
    renderSection({ steps: [completedStep, parkedGate] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleOverviewCurrentStep')).toHaveTextContent(
        PARKED_GATE_LABEL
      )
    );
  });

  it('says so when nothing is waiting on a human', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleOverviewCurrentStep')).toHaveTextContent(
        /nothing is waiting/i
      )
    );
  });

  it('names the run the projection correlated to', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleOverviewRuns')).toHaveTextContent('run-1')
    );
  });

  it('breaks the rows down by status', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleOverviewStatusCount-completed')).toBeInTheDocument()
    );
  });

  it('counts the rows carrying each status', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleOverviewStatusCount-completed')).toHaveTextContent('1')
    );
  });

  it('names the watches that participated in the discovery', async () => {
    renderSection({ steps: [{ ...completedStep, workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID }] });

    await waitFor(() =>
      expect(
        screen.getByTestId(`pndLifecycleParticipant-${SYSTEM_SECURITY_WATCH_DEEP_ID}`)
      ).toBeInTheDocument()
    );
  });

  it('says so when no watch participated in the discovery', async () => {
    renderSection({ steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleParticipantsEmpty')).toBeInTheDocument()
    );
  });

  it('renders the could-not-correlate state rather than a summary of nothing', async () => {
    renderSection({ correlated: 'false', steps: [completedStep] });

    await waitFor(() =>
      expect(screen.getByTestId('pndCorrelationUnavailableState')).toBeInTheDocument()
    );
  });

  it('renders an error state when the projection cannot be read', async () => {
    const get = jest.fn(async () => {
      throw createHttpFetchError({ status: 403 });
    });

    renderWithPndProviders(<LifecycleSummarySection correlationId="ad-1" />, {
      services: { http: { get } },
    });

    await waitFor(() => expect(screen.getByTestId('pndErrorState')).toBeInTheDocument());
  });
});
