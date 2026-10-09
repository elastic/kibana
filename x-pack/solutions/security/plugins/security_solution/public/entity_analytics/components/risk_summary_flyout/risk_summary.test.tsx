/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockHostRiskScoreState,
  mockUserRiskScoreState,
  mockHostEntityRiskScores,
  mockHostEntityRiskScoresWithResolution,
  mockUserEntityRiskScores,
} from '../../../flyout/entity_details/mocks';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { FlyoutRiskSummary } from './risk_summary';
import type {
  LensAttributes,
  VisualizationEmbeddableProps,
} from '../../../common/components/visualization_actions/types';
import type { Query } from '@kbn/es-query';
import { EntityType } from '../../../../common/search_strategy';
import {
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
} from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG } from '../../../../common/constants';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../../types';

const mockVisualizationEmbeddable = jest
  .fn()
  .mockReturnValue(<div data-test-subj="visualization-embeddable" />);

jest.mock('../../../common/components/visualization_actions/visualization_embeddable', () => ({
  VisualizationEmbeddable: (props: VisualizationEmbeddableProps) =>
    mockVisualizationEmbeddable(props),
}));

const renderSummary = (
  ui: React.ReactElement,
  { newEntityAnalyticsPage = false }: { newEntityAnalyticsPage?: boolean } = {}
) => {
  const startServices = createStartServicesMock();
  jest
    .mocked(startServices.featureFlags.useBooleanValue)
    .mockImplementation((flag, fallback) =>
      flag === USE_NEW_ENTITY_ANALYTICS_HOME_PAGE_FLAG ? newEntityAnalyticsPage : fallback
    );

  return render(<TestProviders startServices={startServices as StartServices}>{ui}</TestProviders>);
};

describe('FlyoutRiskSummary', () => {
  beforeEach(() => {
    mockVisualizationEmbeddable.mockClear();
  });

  it('renders risk summary table with context and totals', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={mockHostEntityRiskScores}
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

    expect(getByTestId('entityRiskInputsTitleLink')).toBeInTheDocument();
    expect(getByTestId('entityRiskInputsTitleIcon')).toBeInTheDocument();
  });

  it('renders link without icon when in preview mode', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={mockHostEntityRiskScores}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode
          entityType={EntityType.host}
        />
      </TestProviders>
    );

    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
    expect(getByTestId('entityRiskInputsTitleLink')).toBeInTheDocument();
    expect(queryByTestId('entityRiskInputsTitleIcon')).not.toBeInTheDocument();
  });

  it('renders risk summary table when riskScoreData is empty', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={{ ...mockHostRiskScoreState, data: undefined }}
          entityRiskScores={mockHostEntityRiskScores}
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

  it('risk summary header renders link even when riskScoreData is loading', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={{ ...mockHostRiskScoreState, data: undefined, loading: true }}
          entityRiskScores={mockHostEntityRiskScores}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
        />
      </TestProviders>
    );

    expect(getByTestId('entityRiskInputsTitleLink')).toBeInTheDocument();
  });

  it('renders visualization embeddable', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={mockHostEntityRiskScores}
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
          entityRiskScores={mockHostEntityRiskScores}
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
          entityRiskScores={mockHostEntityRiskScores}
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
          entityRiskScores={mockHostEntityRiskScores}
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
          entityRiskScores={mockUserEntityRiskScores}
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
          entityRiskScores={mockUserEntityRiskScores}
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

  it('entity risk inputs link calls openDetailsPanel with entity sub-tab', () => {
    const openDetailsPanel = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={mockHostEntityRiskScores}
          queryId={'testQuery'}
          openDetailsPanel={openDetailsPanel}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('entityRiskInputsTitleLink'));

    expect(openDetailsPanel).toHaveBeenCalledWith({
      tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
      subTab: RiskScoreLeftPanelSubTab.ENTITY,
    });
  });

  it('resolution risk inputs link calls openDetailsPanel with resolution sub-tab', () => {
    const openDetailsPanel = jest.fn();
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={mockHostEntityRiskScoresWithResolution}
          queryId={'testQuery'}
          openDetailsPanel={openDetailsPanel}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
          entityId="host:alias-entity"
        />
      </TestProviders>
    );

    fireEvent.click(getByTestId('resolutionRiskInputsTitleLink'));

    expect(openDetailsPanel).toHaveBeenCalledWith({
      tab: EntityDetailsLeftPanelTab.RISK_INPUTS,
      subTab: RiskScoreLeftPanelSubTab.RESOLUTION,
    });
  });

  it('renders resolution risk inputs link even when resolution score is loading', () => {
    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={{
            base: { ...mockHostRiskScoreState },
            resolution: {
              state: { ...mockHostRiskScoreState, loading: true },
              hasResolutionGroup: true,
              resolutionTargetEntityId: 'host:target-entity',
            },
            refetch: jest.fn(),
          }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
          entityId="host:alias-entity"
        />
      </TestProviders>
    );

    expect(getByTestId('resolutionRiskInputsTitleLink')).toBeInTheDocument();
  });

  it('renders resolution risk score block when resolution score exists', () => {
    const { getByTestId, getAllByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={mockHostEntityRiskScoresWithResolution}
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
  });

  it('falls back to prefetchedResolutionRisk when the inner risk-index lookup returns no data', () => {
    const prefetchedResolutionRisk = mockHostRiskScoreState.data?.[0];

    const { getByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={{
            base: { ...mockHostRiskScoreState },
            resolution: {
              state: { ...mockHostRiskScoreState, data: undefined },
              hasResolutionGroup: true,
              resolutionTargetEntityId: 'host:target-entity',
            },
            refetch: jest.fn(),
          }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
          entityId="host:alias-entity"
          prefetchedResolutionRisk={prefetchedResolutionRisk}
        />
      </TestProviders>
    );

    expect(getByTestId('resolution-risk-summary-table')).toBeInTheDocument();
  });

  it('does not render resolution risk block when neither the lookup nor prefetchedResolutionRisk has data', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={{
            base: { ...mockHostRiskScoreState },
            resolution: {
              state: { ...mockHostRiskScoreState, data: undefined },
              hasResolutionGroup: true,
              resolutionTargetEntityId: 'host:target-entity',
            },
            refetch: jest.fn(),
          }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
          entityId="host:alias-entity"
        />
      </TestProviders>
    );

    expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
  });

  it('does not render resolution risk score block for standalone entities', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <FlyoutRiskSummary
          riskScoreData={mockHostRiskScoreState}
          entityRiskScores={{
            base: { ...mockHostRiskScoreState },
            resolution: {
              state: { ...mockHostRiskScoreState },
              hasResolutionGroup: false,
              resolutionTargetEntityId: 'host:target-entity',
            },
            refetch: jest.fn(),
          }}
          queryId={'testQuery'}
          openDetailsPanel={() => {}}
          recalculatingScore={false}
          isPreviewMode={false}
          entityType={EntityType.host}
          entityId="host:alias-entity"
        />
      </TestProviders>
    );

    expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
  });

  it('shows only the resolution score when the new entity analytics page flag is on', () => {
    const { getByTestId, queryByTestId, getAllByTestId } = renderSummary(
      <FlyoutRiskSummary
        riskScoreData={mockHostRiskScoreState}
        entityRiskScores={mockHostEntityRiskScoresWithResolution}
        queryId={'testQuery'}
        openDetailsPanel={() => {}}
        recalculatingScore={false}
        isPreviewMode={false}
        entityType={EntityType.host}
        entityId="host:alias-entity"
      />,
      { newEntityAnalyticsPage: true }
    );

    expect(queryByTestId('risk-summary-table')).not.toBeInTheDocument();
    expect(getByTestId('resolution-risk-summary-table')).toBeInTheDocument();
    expect(getAllByTestId('visualization-embeddable')).toHaveLength(1);
    expect(
      getByTestId('resolutionRiskInputsContent').querySelector(
        '[data-test-subj="inspect-icon-button"]'
      )
    ).toBeTruthy();
  });

  it('labels the resolution score as the entity risk score when the new entity analytics page flag is on', () => {
    const { getByTestId } = renderSummary(
      <FlyoutRiskSummary
        riskScoreData={mockHostRiskScoreState}
        entityRiskScores={mockHostEntityRiskScoresWithResolution}
        queryId={'testQuery'}
        openDetailsPanel={() => {}}
        recalculatingScore={false}
        isPreviewMode={false}
        entityType={EntityType.host}
        entityId="host:alias-entity"
      />,
      { newEntityAnalyticsPage: true }
    );

    expect(getByTestId('resolutionRiskInputsTitleLink')).toHaveTextContent(
      'Entity risk contributions'
    );
    expect(mockVisualizationEmbeddable).toHaveBeenCalledWith(
      expect.objectContaining({
        lensAttributes: expect.objectContaining({
          state: expect.objectContaining({
            datasourceStates: expect.anything(),
          }),
        }),
        casesAttachmentMetadata: {
          description: expect.stringMatching(/^Risk score for host/),
        },
      })
    );
    expect(JSON.stringify(mockVisualizationEmbeddable.mock.calls[0][0].lensAttributes)).toContain(
      'Entity risk score'
    );
  });

  it('labels the resolution score as the resolution group when the flag is off', () => {
    const { getByTestId } = renderSummary(
      <FlyoutRiskSummary
        riskScoreData={mockHostRiskScoreState}
        entityRiskScores={mockHostEntityRiskScoresWithResolution}
        queryId={'testQuery'}
        openDetailsPanel={() => {}}
        recalculatingScore={false}
        isPreviewMode={false}
        entityType={EntityType.host}
        entityId="host:alias-entity"
      />
    );

    expect(getByTestId('resolutionRiskInputsTitleLink')).toHaveTextContent(
      'Resolution group risk contributions'
    );
    expect(getByTestId('entityRiskInputsTitleLink')).toHaveTextContent('Entity risk contributions');
  });

  it('holds the entity score back while the resolution score for a group is loading', () => {
    const { getByTestId, queryByTestId } = renderSummary(
      <FlyoutRiskSummary
        riskScoreData={mockHostRiskScoreState}
        entityRiskScores={{
          base: { ...mockHostRiskScoreState },
          resolution: {
            state: { ...mockHostRiskScoreState, data: undefined, loading: true },
            hasResolutionGroup: true,
            resolutionTargetEntityId: 'host:target-entity',
          },
          refetch: jest.fn(),
        }}
        queryId={'testQuery'}
        openDetailsPanel={() => {}}
        recalculatingScore={false}
        isPreviewMode={false}
        entityType={EntityType.host}
        entityId="host:alias-entity"
      />,
      { newEntityAnalyticsPage: true }
    );

    expect(queryByTestId('risk-summary-table')).not.toBeInTheDocument();
    expect(getByTestId('resolution-risk-summary-table')).toBeInTheDocument();
  });

  it('keeps the individual score when the group has no resolution score and the flag is on', () => {
    const { getByTestId, queryByTestId } = renderSummary(
      <FlyoutRiskSummary
        riskScoreData={mockHostRiskScoreState}
        entityRiskScores={{
          base: { ...mockHostRiskScoreState },
          resolution: {
            state: { ...mockHostRiskScoreState, data: undefined, loading: false },
            hasResolutionGroup: true,
            resolutionTargetEntityId: 'host:target-entity',
          },
          refetch: jest.fn(),
        }}
        queryId={'testQuery'}
        openDetailsPanel={() => {}}
        recalculatingScore={false}
        isPreviewMode={false}
        entityType={EntityType.host}
        entityId="host:alias-entity"
      />,
      { newEntityAnalyticsPage: true }
    );

    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
    expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
  });

  it('keeps the individual score for an ungrouped entity when the flag is on', () => {
    const { getByTestId, queryByTestId } = renderSummary(
      <FlyoutRiskSummary
        riskScoreData={mockHostRiskScoreState}
        entityRiskScores={mockHostEntityRiskScores}
        queryId={'testQuery'}
        openDetailsPanel={() => {}}
        recalculatingScore={false}
        isPreviewMode={false}
        entityType={EntityType.host}
      />,
      { newEntityAnalyticsPage: true }
    );

    expect(getByTestId('risk-summary-table')).toBeInTheDocument();
    expect(queryByTestId('resolution-risk-summary-table')).not.toBeInTheDocument();
  });
});
