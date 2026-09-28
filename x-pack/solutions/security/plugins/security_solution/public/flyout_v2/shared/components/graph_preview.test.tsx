/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { mockContextValue } from '../../../flyout/document_details/shared/mocks/mock_context';
import { DocumentDetailsContext } from '../../../flyout/document_details/shared/context';
import { GraphPreview, type GraphPreviewProps } from './graph_preview';
import { GRAPH_PREVIEW_TEST_ID, GRAPH_PREVIEW_LOADING_TEST_ID } from './test_ids';

const renderGraphPreview = (contextValue: DocumentDetailsContext, props: GraphPreviewProps) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={contextValue}>
        <GraphPreview {...props} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

const ERROR_MESSAGE = 'An error is preventing this alert from being visualized.';

describe('<GraphPreview />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows graph preview correctly when data is loaded', async () => {
    const graphProps: GraphPreviewProps = {
      isLoading: false,
      isError: false,
      originEntityId: 'host:macbook-john-work',
      originRiskScore: 90.01,
      data: {
        nodes: [
          {
            id: 'host:macbook-john-work',
            label: 'macbook-john-work',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
            riskScore: 90.01,
          },
          {
            id: 'host:peer-critical',
            label: 'peer-critical',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
            riskScore: 95.5,
          },
          {
            id: 'host:peer-high',
            label: 'peer-high',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
            riskScore: 80.01,
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'host:macbook-john-work',
            target: 'host:peer-critical',
            color: 'primary',
          },
          {
            id: 'e2',
            source: 'host:macbook-john-work',
            target: 'host:peer-high',
            color: 'primary',
          },
        ],
      },
    };

    const { findByTestId, findByText } = renderGraphPreview(mockContextValue, graphProps);

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    // Origin risk badge must reflect the flyout Entity risk score
    expect(await findByText('90.01')).toBeInTheDocument();
    expect(screen.getByTestId('graph-preview-relationships-pill')).toBeInTheDocument();
    expect(screen.getAllByTestId('graph-preview-risk-badge').length).toBeGreaterThanOrEqual(2);
  });

  it('shows Unknown on origin when flyout entity risk is Unknown', async () => {
    const graphProps: GraphPreviewProps = {
      isLoading: false,
      isError: false,
      originEntityId: 'host:edge-sec',
      // Explicit null = flyout Unknown — must not use mock Critical score from nodes
      originRiskScore: null,
      data: {
        nodes: [
          {
            id: 'host:edge-sec',
            label: 'edge-sec-ubuntu',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
            riskScore: 98.72,
          },
          {
            id: 'host:peer',
            label: 'peer',
            color: 'primary',
            shape: 'hexagon',
            icon: 'storage',
            riskScore: 90.01,
          },
        ],
        edges: [
          {
            id: 'e1',
            source: 'host:edge-sec',
            target: 'host:peer',
            color: 'primary',
          },
        ],
      },
    };

    const { findByTestId, findByText, queryByText } = renderGraphPreview(
      mockContextValue,
      graphProps
    );

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(await findByText('Unknown')).toBeInTheDocument();
    expect(queryByText('98.72')).not.toBeInTheDocument();
  });

  it('shows loading when data is loading', () => {
    const graphProps = {
      isLoading: true,
      isError: false,
    };

    const { getByTestId } = renderGraphPreview(mockContextValue, graphProps);

    expect(getByTestId(GRAPH_PREVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('shows error message when there is an error', () => {
    const graphProps = {
      isLoading: false,
      isError: true,
    };

    const { getByText } = renderGraphPreview(mockContextValue, graphProps);

    expect(getByText(ERROR_MESSAGE)).toBeInTheDocument();
  });

  it('shows error message when data is empty', () => {
    const graphProps = {
      isLoading: false,
      isError: false,
    };

    const { getByText } = renderGraphPreview(mockContextValue, graphProps);

    expect(getByText(ERROR_MESSAGE)).toBeInTheDocument();
  });
});
