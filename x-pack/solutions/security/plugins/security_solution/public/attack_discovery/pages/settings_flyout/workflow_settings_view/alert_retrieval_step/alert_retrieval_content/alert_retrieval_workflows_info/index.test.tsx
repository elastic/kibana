/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { AlertRetrievalWorkflowsInfo } from '.';
import type { UseFetchDefaultEsqlQueryResult } from '../../../../workflow_configuration/hooks/use_fetch_default_esql_query';

const mockGetActiveSpace = jest.fn();
const mockGetUrlForApp = jest.fn();

jest.mock('../../../../../../../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
      },
      spaces: {
        getActiveSpace: mockGetActiveSpace,
      },
    },
  }),
}));

const fetchDefaultEsqlQuery = jest.fn();

const defaultFetchDefaultEsqlQueryResult: UseFetchDefaultEsqlQueryResult = {
  defaultEsqlQuery: 'FROM .alerts-security.alerts-default | LIMIT 100',
  fetchDefaultEsqlQuery,
  isError: false,
  isLoading: false,
  resetCache: jest.fn(),
};

const openPopover = () => {
  fireEvent.click(screen.getByTestId('alertRetrievalWorkflowsInfoButton'));
};

describe('AlertRetrievalWorkflowsInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveSpace.mockResolvedValue({ id: 'default' });
    mockGetUrlForApp.mockReturnValue('app/workflows');
  });

  it('renders the info button', () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    expect(screen.getByTestId('alertRetrievalWorkflowsInfoButton')).toBeInTheDocument();
  });

  it('does not render the example YAML before the popover is opened', () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    expect(screen.queryByTestId('alertRetrievalWorkflowsExampleYaml')).not.toBeInTheDocument();
  });

  it('opens the popover and shows the example YAML when the button is clicked', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    expect(await screen.findByTestId('alertRetrievalWorkflowsExampleYaml')).toBeInTheDocument();
  });

  it('renders the headline', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    expect(
      await screen.findByText(
        'Run your own workflows to retrieve and enrich alerts for Attack Discovery'
      )
    ).toBeInTheDocument();
  });

  it('renders the detail callout', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    expect(await screen.findByTestId('alertRetrievalWorkflowsDetailCallout')).toBeInTheDocument();
  });

  it('fetches the default ES|QL query when the popover is opened', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    await screen.findByTestId('alertRetrievalWorkflowsExampleYaml');

    expect(fetchDefaultEsqlQuery).toHaveBeenCalled();
  });

  it('embeds the default ES|QL query in the example YAML', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    expect(await screen.findByTestId('alertRetrievalWorkflowsExampleYaml')).toHaveTextContent(
      'FROM .alerts-security.alerts-default | LIMIT 100'
    );
  });

  it('embeds a space-specific fallback query when the default query is unavailable', async () => {
    mockGetActiveSpace.mockResolvedValue({ id: 'my-space' });

    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={{
          ...defaultFetchDefaultEsqlQueryResult,
          defaultEsqlQuery: undefined,
        }}
      />
    );

    openPopover();

    await waitFor(() => {
      expect(screen.getByTestId('alertRetrievalWorkflowsExampleYaml')).toHaveTextContent(
        'FROM .alerts-security.alerts-my-space'
      );
    });
  });

  it('renders the Copy button', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    expect(await screen.findByTestId('alertRetrievalWorkflowsCopyButton')).toBeInTheDocument();
  });

  it('closes the popover when the Close button is clicked', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    fireEvent.click(await screen.findByTestId('alertRetrievalWorkflowsCloseButton'));

    await waitFor(() => {
      expect(screen.queryByTestId('alertRetrievalWorkflowsExampleYaml')).not.toBeInTheDocument();
    });
  });

  it('renders the Create new workflow button linking to the workflows create page', async () => {
    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    expect(await screen.findByTestId('alertRetrievalWorkflowsCreateButton')).toHaveAttribute(
      'href',
      'app/workflows/create'
    );
  });

  it('disables the Create new workflow button when the workflows app URL is unavailable', async () => {
    mockGetUrlForApp.mockReturnValue('');

    render(
      <AlertRetrievalWorkflowsInfo
        fetchDefaultEsqlQueryResult={defaultFetchDefaultEsqlQueryResult}
      />
    );

    openPopover();

    expect(await screen.findByTestId('alertRetrievalWorkflowsCreateButton')).toBeDisabled();
  });
});
