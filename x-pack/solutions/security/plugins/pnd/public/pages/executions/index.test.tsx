/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route } from '@kbn/shared-ux-router';
import { screen, waitFor } from '@testing-library/react';
import { PHASE_CATALOG, PND_CONVERSATIONS_URL, PND_PROPOSALS_URL } from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../common/constants';
import { renderWithPndProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import { ExecutionsPage } from '.';

const EXECUTION_REQUEST_OPTIONS = { asResponse: true, version: '1' };

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
      steps: PHASE_CATALOG.map(({ id, liveness }) => ({
        deepLinkPath: `/system-security-watch-deep?tab=executions&executionId=run-1&stepExecutionId=${id}-step`,
        phaseStepId: id,
        status: liveness === 'live' ? ('completed' as const) : ('upstream' as const),
        stepExecutionId: `${id}-step`,
        workflowId: 'system-security-watch-deep',
        workflowRunId: 'run-1',
      })),
    },
    headers: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
  });
});

const services = {
  application: {
    getUrlForApp: (appId: string, { path }: { path: string }) => `/s/agent-4/app/${appId}${path}`,
    navigateToApp: jest.fn(),
  },
  chrome: { docTitle: { change: jest.fn(), reset: jest.fn() } },
  http: { get },
};

const render = (route: string) =>
  renderWithPndProviders(<Route path="/executions/:correlationId?" component={ExecutionsPage} />, {
    route,
    services,
  });

describe('ExecutionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the lifecycle for the discovery in the route', async () => {
    render('/executions/ad-1');

    await waitFor(() => expect(screen.getByTestId('pndLifecycleView')).toBeInTheDocument());
  });

  it('reads the projection for the discovery in the route', async () => {
    render('/executions/ad-1');

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/internal/pnd/executions/ad-1', EXECUTION_REQUEST_OPTIONS)
    );
  });

  it('decodes an encoded discovery id, so it is not double-encoded on the way to the API', async () => {
    render('/executions/ad%201%2F2');

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        '/internal/pnd/executions/ad%201%2F2',
        EXECUTION_REQUEST_OPTIONS
      )
    );
  });

  it('names the discovery in the page subtitle', async () => {
    render('/executions/ad-1');

    await waitFor(() => expect(screen.getByText(/ad-1/)).toBeInTheDocument());
  });

  it('asks for a discovery when the route carries none', () => {
    render('/executions');

    expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('reads nothing when the route carries no discovery', () => {
    render('/executions');

    expect(get).not.toHaveBeenCalled();
  });
});
