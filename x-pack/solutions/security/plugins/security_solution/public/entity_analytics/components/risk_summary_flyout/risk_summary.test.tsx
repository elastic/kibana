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
import { EntityType } from '../../../../common/search_strategy';
import type { RiskScoreState } from '../../api/hooks/use_risk_score';

const mockVisualizationEmbeddable = jest
  .fn()
  .mockReturnValue(<div data-test-subj="visualization-embeddable" />);
const mockUseRiskScore = jest.fn();
const mockUseResolutionGroup = jest.fn();

jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: (props: VisualizationEmbeddableProps) =>
    mockVisualizationEmbeddable(props),
}));

jest.mock('../../api/hooks/use_risk_score', () => {
  const actual = jest.requireActual('../../api/hooks/use_risk_score');
  return {
    ...actual,
    useRiskScore: (params: unknown) => mockUseRiskScore(params),
  };
});

jest.mock('../entity_resolution/hooks/use_resolution_group', () => ({
  useResolutionGroup: (entityId: string) => mockUseResolutionGroup(entityId),
}));

describe('FlyoutRiskSummary', () => {
  beforeEach(() => {
    mockVisualizationEmbeddable.mockClear();
    mockUseResolutionGroup.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    mockUseRiskScore.mockReturnValue({
      ...(mockHostRiskScoreState as RiskScoreState<EntityType.host>),
      data: undefined,
    });
  });

  it('renders risk summary table with context and totals', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
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

    expect(getByTestId('riskInputsTitleLink')).toBeInTheDocument();
    expect(getByTestId('riskInputsTitleIcon')).toBeInTheDocument();
  });

  it('renders link without icon when in preview mode', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode
          entityType={EntityType.host}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
    expect(getByTestId('riskInputsTitleLink')).toBeInTheDocument();
    expect(queryByTestId('riskInputsTitleIcon')).not.toBeInTheDocument();
  });

  it('renders risk summary table when riskScoreData is empty', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={{ ...mockHostRiskScoreState, data: undefined }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
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
          isPreviewMode={false}
          entityType={EntityType.host}
        />
      </TestProviders>
    );

    expect(queryByTestId('riskInputsTitleLink')).not.toBeInTheDocument();
  });

  it('renders visualization embeddable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
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
          isPreviewMode={false}
          entityType={EntityType.host}
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
          isPreviewMode={false}
          entityType={EntityType.host}
        />
      </TestProviders>
    );

    const lensAttributes: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].lensAttributes;
    const datasourceLayers = Object.values(
      lensAttributes.state.datasourceStates.formBased?.layers ?? {}
    );
    const firstColumn = Object.values(datasourceLayers[0].columns)[0];

    expect((lensAttributes.state.query as Query).query).toEqual(
      'host.name: "test" AND NOT host.risk.score_type: "resolution"'
    );
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
          isPreviewMode={false}
          entityType={EntityType.host}
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
          isPreviewMode={false}
          entityType={EntityType.user}
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
          isPreviewMode={false}
          entityType={EntityType.user}
        />
      </TestProviders>
    );

    const lensAttributes: LensAttributes =
      mockVisualizationEmbeddable.mock.calls[0][0].lensAttributes;
    const datasourceLayers = Object.values(
      lensAttributes.state.datasourceStates.formBased?.layers ?? {}
    );
    const firstColumn = Object.values(datasourceLayers[0].columns)[0];

    expect((lensAttributes.state.query as Query).query).toEqual(
      'user.name: "test" AND NOT user.risk.score_type: "resolution"'
    );
    expect(firstColumn).toEqual(
      expect.objectContaining({
        sourceField: 'user.risk.calculated_score_norm',
      })
    );
  });

  it('renders resolution risk score block when resolution score exists', () => {
    mockUseResolutionGroup.mockReturnValue({
      data: {
        target: {
          entity: {
            id: 'host:target-entity',
          },
        },
        aliases: [],
        group_size: 1,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
    });
    mockUseRiskScore.mockReturnValue({
      ...(mockHostRiskScoreState as RiskScoreState<EntityType.host>),
      data: mockHostRiskScoreState.data,
      loading: false,
    });

    const { getByTestId, getAllByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
          entityId="host:alias-entity"
        />
      </TestProviders>
    );

    expect(getByTestId('resolution-risk-summary-table')).toBeInTheDocument();
    expect(getAllByTestId('visualization-embeddable')).toHaveLength(2);
    expect(mockUseRiskScore).toHaveBeenCalledWith(
      expect.objectContaining({
        filterQuery: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([
              expect.objectContaining({
                term: expect.objectContaining({
                  'host.risk.id_value': 'host:target-entity',
                }),
              }),
              expect.objectContaining({
                term: expect.objectContaining({
                  'host.risk.score_type': 'resolution',
                }),
              }),
            ]),
          }),
        }),
      })
    );
  });
});
