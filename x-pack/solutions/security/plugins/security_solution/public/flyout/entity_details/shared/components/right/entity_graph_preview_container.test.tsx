/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { METRIC_TYPE } from '@kbn/analytics';
import { useFetchGraphData } from '@kbn/cloud-security-posture-graph/src/hooks';
import {
  GRAPH_PREVIEW,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { TestProviders } from '../../../../../common/mock';
import { useUpsellingComponent } from '../../../../../common/hooks/use_upselling';
import { useShouldShowGraph } from '../../../../shared/hooks/use_should_show_graph';
import {
  EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID,
  GRAPH_PREVIEW_TEST_ID,
} from '../../../../../flyout_v2/shared/components/test_ids';
import { EntityGraphPreviewContainer } from './entity_graph_preview_container';

jest.mock('../../../../../common/hooks/use_upselling');
jest.mock('../../../../shared/hooks/use_should_show_graph');
jest.mock('@kbn/cloud-security-posture-graph/src/hooks', () => ({
  useFetchGraphData: jest.fn(),
}));
jest.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => ({
  uiMetricService: { trackUiMetric: jest.fn() },
}));
jest.mock('@kbn/cloud-security-posture-graph', () => ({
  Graph: () => <div data-test-subj="securitySolutionFlyoutGraphPreview" />,
}));

const mockUseUpsellingComponent = useUpsellingComponent as jest.Mock;
const mockUseShouldShowGraph = useShouldShowGraph as jest.Mock;
const mockUseFetchGraphData = useFetchGraphData as jest.Mock;
const uiMetricServiceMock = uiMetricService as jest.Mocked<typeof uiMetricService>;

const mockOnShowGraph = jest.fn();

const renderContainer = (
  overrides: Partial<React.ComponentProps<typeof EntityGraphPreviewContainer>> = {}
) =>
  render(
    <TestProviders>
      <EntityGraphPreviewContainer
        entityId="test-entity-id"
        onShowGraph={mockOnShowGraph}
        showIcon
        disableNavigation={false}
        {...overrides}
      />
    </TestProviders>
  );

describe('<EntityGraphPreviewContainer />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUpsellingComponent.mockReturnValue(null);
    mockUseShouldShowGraph.mockReturnValue(true);
    mockUseFetchGraphData.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { nodes: [{ id: '1', color: 'primary', shape: 'ellipse' }], edges: [] },
    });
  });

  it('fetches graph data from the entity id', async () => {
    const { findByTestId } = renderContainer();

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    expect(mockUseFetchGraphData).toHaveBeenCalledWith({
      req: {
        query: {
          entityIds: [{ id: 'test-entity-id', isOrigin: true }],
          start: 'now-30d',
          end: 'now',
        },
      },
      options: {
        enabled: true,
        refetchOnWindowFocus: false,
      },
    });
  });

  it('calls onShowGraph when the header link is clicked', async () => {
    const { findByTestId, getByTestId } = renderContainer();

    expect(await findByTestId(GRAPH_PREVIEW_TEST_ID)).toBeInTheDocument();
    getByTestId(EXPANDABLE_PANEL_HEADER_TITLE_LINK_TEST_ID(GRAPH_PREVIEW_TEST_ID)).click();

    expect(mockOnShowGraph).toHaveBeenCalled();
  });

  it('tracks ui metric when graph is available', async () => {
    const { findByTestId } = renderContainer();
    await findByTestId(GRAPH_PREVIEW_TEST_ID);

    expect(uiMetricServiceMock.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.LOADED,
      GRAPH_PREVIEW
    );
  });
});
