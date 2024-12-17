/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockHostRiskScoreState,
  mockUserRiskScoreState,
} from '../../../flyout/entity_details/mocks';
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { FlyoutRiskSummary } from './risk_summary';
import type {
  LensAttributes,
  VisualizationEmbeddableProps,
} from '../../../common/components/visualization_actions/types';
import type { Query } from '@kbn/es-query';

const mockVisualizationEmbeddable = jest
  .fn()
  .mockReturnValue(<div data-test-subj="visualization-embeddable" />);

jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: (props: VisualizationEmbeddableProps) =>
    mockVisualizationEmbeddable(props),
}));

describe('FlyoutRiskSummary', () => {
  beforeEach(() => {
    mockVisualizationEmbeddable.mockClear();
  });

  it('renders risk summary table with context and totals', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-table')).toBeInTheDocument();

    // Alerts
    expect(getByTestId('risk-summary-table')).toHaveTextContent(
      `${mockHostRiskScoreState.data?.[0].host.risk.category_1_count}`
    );

    // Result
    expect(getByTestId('risk-summary-result-count')).toHaveTextContent(
      `${mockHostRiskScoreState.data?.[0].host.risk.category_1_count}`
    );

    expect(getByTestId('risk-summary-result-score')).toHaveTextContent(
      `${
        (mockHostRiskScoreState.data?.[0].host.risk.category_1_score ?? 0) +
        (mockHostRiskScoreState.data?.[0].host.risk.category_2_score ?? 0)
      }`
    );
  });

  it('renders risk summary table when riskScoreData is empty', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={{ ...mockHostRiskScoreState, data: undefined }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );
    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
  });

  it('risk summary header does not render link when riskScoreData is loading', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={{ ...mockHostRiskScoreState, data: undefined, loading: true }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    expect(queryByTestId('riskInputsTitleLink')).not.toBeInTheDocument();
  });

  it('risk summary header does not render expand icon when in preview mode', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={{ ...mockHostRiskScoreState, data: undefined, loading: true }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode
        />
      </TestProviders>
    );

    expect(queryByTestId('riskInputsTitleLink')).not.toBeInTheDocument();
    expect(queryByTestId('riskInputsTitleIcon')).not.toBeInTheDocument();
  });

  it('renders visualization embeddable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    expect(getByTestId('visualization-embeddable')).toBeInTheDocument();
  });

  it('renders updated at', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-updatedAt')).toHaveTextContent('Updated Nov 8, 1989');
  });

  it('builds lens attributes for host risk score', () => {
    render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    const lensAttributes: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].lensAttributes;
    const datasourceLayers = Object.values(
      lensAttributes.state.datasourceStates.formBased?.layers ?? {}
    );
    const firstColumn = Object.values(datasourceLayers[0].columns)[0];

    expect((lensAttributes.state.query as Query).query).toEqual('host.name: test');
    expect(firstColumn).toEqual(
      expect.objectContaining({
        sourceField: 'host.risk.calculated_score_norm',
      })
    );
  });

  it('builds lens cases attachment metadata for host risk score', () => {
    render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    const lensMetadata: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].casesAttachmentMetadata;

    expect(lensMetadata).toMatchInlineSnapshot(`
      Object {
        "description": "Risk score for host test",
      }
    `);
  });

  it('builds lens cases attachment metadata for user risk score', () => {
    render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockUserRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    const lensMetadata: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].casesAttachmentMetadata;

    expect(lensMetadata).toMatchInlineSnapshot(`
      Object {
        "description": "Risk score for user test",
      }
    `);
  });

  it('builds lens attributes for user risk score', () => {
    render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockUserRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
        />
      </TestProviders>
    );

    const lensAttributes: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].lensAttributes;
    const datasourceLayers = Object.values(
      lensAttributes.state.datasourceStates.formBased?.layers ?? {}
    );
    const firstColumn = Object.values(datasourceLayers[0].columns)[0];

    expect((lensAttributes.state.query as Query).query).toEqual('user.name: test');
    expect(firstColumn).toEqual(
      expect.objectContaining({
        sourceField: 'user.risk.calculated_score_norm',
      })
    );
  });
});
