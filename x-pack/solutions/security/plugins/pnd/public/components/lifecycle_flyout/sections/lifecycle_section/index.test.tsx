/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { PND_CONVERSATIONS_URL, PND_PROPOSALS_URL } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../../../common/constants';
import { createHttpResponse } from '../../../../test_helpers/create_http_response';
import { renderWithPndProviders } from '../../../test_utils/render_with_pnd_providers';
import { LifecycleStepsSection } from '.';

const get = jest.fn(async (path: string) => {
  if (path === PND_CONVERSATIONS_URL) {
    return { conversations: [], total: 0 };
  }
  if (path === PND_PROPOSALS_URL) {
    return { groups: [], total: 0 };
  }

  return createHttpResponse({
    body: {
      correlationId: 'ad-1',
      steps: [{ phaseStepId: 'step-1-1', status: 'completed', workflowRunId: 'run-1' }],
    },
    headers: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
  });
});

const services = {
  application: {
    getUrlForApp: (appId: string, { path }: { path: string }) => `/s/agent-4/app/${appId}${path}`,
    navigateToApp: jest.fn(),
  },
  http: { get },
};

const renderSection = () =>
  renderWithPndProviders(<LifecycleStepsSection correlationId="ad-1" />, { services });

describe('LifecycleStepsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the lifecycle panel', () => {
    renderSection();

    expect(screen.getByTestId('pndLifecycleSection-lifecycle')).toBeInTheDocument();
  });

  it('names itself, because it is no longer the only thing on its panel', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: 'Lifecycle' })).toBeInTheDocument();
  });

  it('renders the container-agnostic lifecycle view, so the section and the full page cannot drift', async () => {
    renderSection();

    await waitFor(() => expect(screen.getByTestId('pndLifecycleView')).toBeInTheDocument());
  });

  it('renders the catalog through it, grouped into the four phases', async () => {
    renderSection();

    await waitFor(() => expect(screen.getAllByTestId('pndPhaseGroup')).toHaveLength(4));
  });
});
